import { z } from 'zod';

export const createCommentSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  content: z.string().min(1, 'Comment cannot be empty').max(500, 'Comment must be at most 500 characters'),
});
