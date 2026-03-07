import { z } from 'zod';

export const contactSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name must be at most 50 characters'),
    email: z.string().email('Invalid email address'),
    subject: z.string().min(5, 'Subject must be at least 5 characters').max(100, 'Subject must be at most 100 characters'),
    message: z.string().min(10, 'Message must be at least 10 characters').max(1000, 'Message must be at most 1000 characters'),
});
