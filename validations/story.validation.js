import { z } from 'zod';

export const createStorySchema = z.object({
  caption: z.string().max(200, 'Caption must be at most 200 characters').optional(),
  duration: z.number().int().min(5).max(30).optional().default(24), // Duration in hours
});
