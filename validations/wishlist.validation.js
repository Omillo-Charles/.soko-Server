import { z } from 'zod';

export const toggleWishlistSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
});
