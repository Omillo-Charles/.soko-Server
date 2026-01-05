import { z } from 'zod';

export const signUpSchema = z.object({
    name: z.string().min(3, 'Name must be at least 3 characters').max(30, 'Name must be at most 30 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const signInSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});
