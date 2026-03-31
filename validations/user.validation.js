import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(30, 'Name must be at most 30 characters').optional(),
  avatar: z.string().url('Invalid avatar URL').optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const addAddressSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  type: z.enum(['home', 'work', 'other']).default('home'),
  phone: z.string().min(10, 'Valid phone number is required'),
  city: z.string().min(2, 'City is required'),
  street: z.string().min(5, 'Street address is required'),
  isDefault: z.boolean().optional().default(false),
});

export const updateAddressSchema = addAddressSchema.partial();

export const updateAccountTypeSchema = z.object({
  accountType: z.enum(['buyer', 'seller'], {
    errorMap: () => ({ message: 'Account type must be either buyer or seller' })
  }),
});
