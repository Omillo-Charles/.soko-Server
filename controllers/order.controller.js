import Order from "../models/order.model.js";
import Cart from "../models/cart.model.js";
import Product from "../models/product.model.js";
import Shop from "../models/shop.model.js";
import User from "../models/user.model.js";
import { sendEmail } from "../config/nodemailer.js";
import { getOrderConfirmationEmailTemplate, getNewOrderSellerEmailTemplate } from "../utils/emailTemplates.js";
import { calculateShippingFee } from "../utils/shipping.js";

export const createOrder = async (req, res, next) => {
    try {
        const { shippingAddress, items } = req.body;
        const userId = req.user._id;

        if (!items || items.length === 0) {
            const error = new Error('No items in order');
            error.statusCode = 400;
            throw error;
        }

        // 1. Calculate subtotal and group items by shop for emails
        let subtotal = 0;
        const shopOrders = {}; // Group items by shopId

        for (const item of items) {
            const product = await Product.findById(item.product).populate({ path: 'shop', model: Shop });
            if (!product) {
                const error = new Error(`Product ${item.product} not found`);
                error.statusCode = 404;
                throw error;
            }

            const itemTotal = product.price * item.quantity;
            subtotal += itemTotal;

            const shopId = product.shop._id.toString();
            if (!shopOrders[shopId]) {
                shopOrders[shopId] = {
                    shop: product.shop,
                    items: []
                };
            }
            shopOrders[shopId].items.push({
                name: product.name,
                price: product.price,
                quantity: item.quantity,
                image: product.image
            });
        }

        const shippingFee = calculateShippingFee(subtotal);
        const totalAmount = subtotal + shippingFee;

        // 2. Create the order in DB
        const order = await Order.create({
            user: userId,
            items: items.map(item => ({
                product: item.product,
                shop: item.shop,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                image: item.image,
                size: item.size,
                color: item.color
            })),
            subtotal,
            shippingFee,
            totalAmount,
            shippingAddress,
            paymentMethod: 'Cash on Delivery',
            status: 'pending'
        });

        // 3. Send Email to User
        const user = await User.findById(userId);
        try {
            const template = getOrderConfirmationEmailTemplate(order, user);
            await sendEmail({
                to: user.email,
                subject: template.subject,
                text: template.text,
                html: template.html
            });
        } catch (emailError) {
            console.error('Failed to send order confirmation email to user:', emailError);
        }

        // 4. Send Emails to Shops
        for (const shopId in shopOrders) {
            const { shop } = shopOrders[shopId];
            try {
                const template = getNewOrderSellerEmailTemplate(order, shop, user);
                await sendEmail({
                    to: shop.email,
                    subject: template.subject,
                    text: template.text,
                    html: template.html
                });
            } catch (emailError) {
                console.error(`Failed to send order notification to shop ${shopId}:`, emailError);
            }
        }

        // 5. Clear user's cart
        await Cart.findOneAndUpdate({ user: userId }, { items: [] });

        res.status(201).json({
            success: true,
            message: "Order placed successfully",
            data: order
        });
    } catch (error) {
        next(error);
    }
};

export const getMyOrders = async (req, res, next) => {
    try {
        const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            data: orders
        });
    } catch (error) {
        next(error);
    }
};

export const getOrderById = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            const error = new Error(`Order with ID ${req.params.id} not found`);
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({
            success: true,
            data: order
        });
    } catch (error) {
        next(error);
    }
};

export const getSellerOrders = async (req, res, next) => {
    try {
        // 1. Find the shop owned by this user
        const shop = await Shop.findOne({ owner: req.user._id });
        if (!shop) {
            return res.status(200).json({
                success: true,
                data: []
            });
        }

        // 2. Find orders that contain items from this shop
        const orders = await Order.find({
            'items.shop': shop._id
        }).sort({ createdAt: -1 }).populate('user', 'name email');

        res.status(200).json({
            success: true,
            data: orders
        });
    } catch (error) {
        next(error);
    }
};

export const trackOrder = async (req, res, next) => {
    try {
        let { id } = req.params;
        id = id.trim().replace(/^#/, ""); // Remove leading # if present
        
        console.log(`[Order Tracking] Request for ID: ${id}`);
        
        let order;
        const isValidObjectId = id.match(/^[0-9a-fA-F]{24}$/);
        
        if (isValidObjectId) {
            console.log(`[Order Tracking] Searching by full ObjectId: ${id}`);
            order = await Order.findById(id).populate('items.shop', 'name avatar');
        } else if (id.length >= 4 && id.length <= 12) {
            console.log(`[Order Tracking] Searching by short ID suffix: ${id}`);
            // Support searching by short IDs (last characters used in emails/UI)
            order = await Order.findOne({
                $expr: {
                    $eq: [
                        { $toLower: { $substrCP: [{ $toString: "$_id" }, { $subtract: [24, id.length] }, id.length] } },
                        id.toLowerCase()
                    ]
                }
            }).populate('items.shop', 'name avatar');
        } else {
            console.log(`[Order Tracking] ID format not recognized (length: ${id.length})`);
        }

        if (!order) {
            console.log(`[Order Tracking] Order NOT found for ID: ${id}`);
            const error = new Error(`Order with ID #${id} not found. Please make sure you've entered the correct ID from your email.`);
            error.statusCode = 404;
            throw error;
        }

        console.log(`[Order Tracking] Order found: ${order._id}`);

        res.status(200).json({
            success: true,
            data: {
                _id: order._id,
                status: order.status,
                createdAt: order.createdAt,
                updatedAt: order.updatedAt,
                items: order.items.map(item => ({
                    name: item.name,
                    shopName: item.shop?.name,
                    shopAvatar: item.shop?.avatar,
                    quantity: item.quantity,
                    price: item.price,
                    image: item.image
                })),
                totalAmount: order.totalAmount,
                shippingAddress: {
                    city: order.shippingAddress.city,
                    street: order.shippingAddress.street
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

export const updateOrderStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        const { id } = req.params;

        // 1. Check if user owns a shop
        const shop = await Shop.findOne({ owner: req.user._id });
        if (!shop) {
            const error = new Error('Unauthorized: Only shop owners can update order status');
            error.statusCode = 403;
            throw error;
        }

        // 2. Find the order and verify it contains items from this shop
        const isValidId = id.match(/^[0-9a-fA-F]{24}$/);
        if (!isValidId) {
            const error = new Error('Invalid Order ID format');
            error.statusCode = 400;
            throw error;
        }

        const order = await Order.findById(id);
        if (!order) {
            const error = new Error(`Order with ID ${id} not found`);
            error.statusCode = 404;
            throw error;
        }

        const hasItemFromShop = order.items.some(item => item.shop.toString() === shop._id.toString());
        if (!hasItemFromShop) {
            const error = new Error('Unauthorized: Order does not belong to your shop');
            error.statusCode = 403;
            throw error;
        }

        // 3. Update status
        order.status = status;
        await order.save();

        res.status(200).json({
            success: true,
            message: `Order status updated to ${status}`,
            data: order
        });
    } catch (error) {
        next(error);
    }
};
