import Order from "../models/order.model.js";
import Cart from "../models/cart.model.js";
import Product from "../models/product.model.js";
import Shop from "../models/shop.model.js";
import User from "../models/user.model.js";
import { sendEmail } from "../config/nodemailer.js";

export const createOrder = async (req, res, next) => {
    try {
        const { shippingAddress, items } = req.body;
        const userId = req.user._id;

        if (!items || items.length === 0) {
            const error = new Error('No items in order');
            error.statusCode = 400;
            throw error;
        }

        // 1. Calculate total and group items by shop for emails
        let totalAmount = 0;
        const shopOrders = {}; // Group items by shopId

        for (const item of items) {
            const product = await Product.findById(item.product).populate({ path: 'shop', model: Shop });
            if (!product) {
                const error = new Error(`Product ${item.product} not found`);
                error.statusCode = 404;
                throw error;
            }

            const itemTotal = product.price * item.quantity;
            totalAmount += itemTotal;

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
            totalAmount,
            shippingAddress,
            paymentMethod: 'Cash on Delivery',
            status: 'pending'
        });

        // 3. Send Email to User
        const user = await User.findById(userId);
        const userEmailHtml = `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
                <h1 style="color: #2563eb;">Order Confirmed!</h1>
                <p>Hello ${user.name},</p>
                <p>Thank you for your order. Your order ID is <strong>#${order._id}</strong>.</p>
                <h3>Order Summary:</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="border-bottom: 1px solid #ddd;">
                            <th style="text-align: left; padding: 10px;">Item</th>
                            <th style="text-align: center; padding: 10px;">Qty</th>
                            <th style="text-align: right; padding: 10px;">Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${order.items.map(item => `
                            <tr style="border-bottom: 1px solid #eee;">
                                <td style="padding: 10px;">${item.name}</td>
                                <td style="text-align: center; padding: 10px;">${item.quantity}</td>
                                <td style="text-align: right; padding: 10px;">UGX ${item.price.toLocaleString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <p style="text-align: right; font-size: 1.2em; font-weight: bold; margin-top: 20px;">
                    Total: UGX ${totalAmount.toLocaleString()}
                </p>
                <p><strong>Payment Method:</strong> Cash on Delivery</p>
                <p><strong>Delivery Address:</strong> ${shippingAddress.street}, ${shippingAddress.city}</p>
                <hr style="border: 0; border-top: 1px solid #ddd; margin: 20px 0;">
                <p style="font-size: 0.9em; color: #666;">We will notify you when your items are on their way.</p>
            </div>
        `;

        await sendEmail({
            to: user.email,
            subject: `Order Confirmation - #${order._id}`,
            html: userEmailHtml
        });

        // 4. Send Emails to Shops
        for (const shopId in shopOrders) {
            const { shop, items: shopItems } = shopOrders[shopId];
            const shopEmailHtml = `
                <div style="font-family: sans-serif; padding: 20px; color: #333;">
                    <h1 style="color: #2563eb;">New Order Received!</h1>
                    <p>Hello ${shop.name},</p>
                    <p>You have received a new order from <strong>${user.name}</strong> (${user.email}).</p>
                    <h3>Order Details:</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="border-bottom: 1px solid #ddd;">
                                <th style="text-align: left; padding: 10px;">Item</th>
                                <th style="text-align: center; padding: 10px;">Qty</th>
                                <th style="text-align: right; padding: 10px;">Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${shopItems.map(item => `
                                <tr style="border-bottom: 1px solid #eee;">
                                    <td style="padding: 10px;">${item.name}</td>
                                    <td style="text-align: center; padding: 10px;">${item.quantity}</td>
                                    <td style="text-align: right; padding: 10px;">UGX ${item.price.toLocaleString()}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <p><strong>Customer Phone:</strong> ${shippingAddress.phone}</p>
                    <p><strong>Delivery Address:</strong> ${shippingAddress.street}, ${shippingAddress.city}</p>
                    <p><strong>Payment Method:</strong> Cash on Delivery</p>
                    <hr style="border: 0; border-top: 1px solid #ddd; margin: 20px 0;">
                    <p style="font-size: 0.9em; color: #666;">Please process this order as soon as possible.</p>
                </div>
            `;

            await sendEmail({
                to: shop.email,
                subject: `New Order Notification - #${order._id}`,
                html: shopEmailHtml
            });
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
            const error = new Error('Order not found');
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
        const order = await Order.findById(id);
        if (!order) {
            const error = new Error('Order not found');
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
