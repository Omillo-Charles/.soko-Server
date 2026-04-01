import { z } from 'zod';

const orderItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  shopId: z.string().min(1, 'Shop ID is required'),
  name: z.string().min(1, 'Product name is required'),
  price: z.number().positive('Price must be positive'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  image: z.string().optional(),
  size: z.string().optional(),
  color: z.string().optional(),
});

export const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, 'Order must contain at least one item'),
  paymentMethod: z.string().optional().default('Cash on Delivery'),
  shippingAddress: z.object({
    name: z.string().min(2, 'Name is required'),
    phone: z.string().min(10, 'Valid phone number is required'),
    city: z.string().min(2, 'City is required'),
    street: z.string().min(5, 'Street address is required'),
  }),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled'], {
    errorMap: () => ({ message: 'Invalid order status' })
  }),
});
