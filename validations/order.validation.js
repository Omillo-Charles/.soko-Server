import { z } from 'zod';

const orderItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  // shopId may be absent for products not yet linked to a shop
  shopId: z.string().min(1).optional(),
  name: z.string().min(1, 'Product name is required'),
  price: z.number().positive('Price must be positive'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  image: z.string().nullable().optional(),
  // size and color are optional and may be null (products without variants)
  size: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
});

export const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, 'Order must contain at least one item'),
  paymentMethod: z.string().optional().default('Cash on Delivery'),
  shippingAddress: z.object({
    name: z.string().min(2, 'Recipient name is required'),
    // Kenya format: 07XXXXXXXX or 01XXXXXXXX — exactly 10 digits
    phone: z
      .string()
      .regex(/^(07|01)\d{8}$/, 'Phone must be a valid Kenyan number (e.g. 0712345678)'),
    city: z.string().min(2, 'City is required'),
    street: z.string().min(5, 'Street address is required'),
  }),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled'], {
    errorMap: () => ({ message: 'Invalid order status' })
  }),
});
