import { z } from 'zod';

export const registerShopSchema = z.object({
  name: z.string().min(3, 'Shop name must be at least 3 characters').max(50, 'Shop name must be at most 50 characters'),
  username: z.string().min(3, 'Username must be at least 3 characters').regex(/^[a-zA-Z0-0_]+$/, 'Username can only contain letters, numbers, and underscores'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category: z.string().min(1, 'Category is required'),
  address: z.string().min(5, 'Address is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  email: z.string().email('Invalid email address'),
  avatar: z.string().url('Invalid avatar URL').optional(),
  banner: z.string().url('Invalid banner URL').optional(),
});

export const updateShopSchema = registerShopSchema.partial();
