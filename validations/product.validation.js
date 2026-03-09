import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(100, 'Name must be at most 100 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  content: z.string().optional(),
  price: z.preprocess((val) => parseFloat(val), z.number().positive('Price must be a positive number')),
  category: z.string().min(1, 'Category is required'),
  stock: z.preprocess((val) => parseInt(val), z.number().int().min(0, 'Stock cannot be negative')).optional().default(1),
  sizes: z.array(z.string()).optional(),
  colors: z.array(z.string()).optional(),
  image: z.string().url('Invalid image URL').optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const rateProductSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
});
