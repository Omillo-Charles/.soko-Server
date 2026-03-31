import { z } from 'zod';

export const stkPushSchema = z.object({
  phoneNumber: z.string()
    .min(10, 'Phone number must be at least 10 digits')
    .regex(/^(\+?254|0)?[17]\d{8}$/, 'Invalid Kenyan phone number format'),
  amount: z.number().positive('Amount must be positive').or(
    z.string().transform((val) => {
      const num = parseFloat(val);
      if (isNaN(num) || num <= 0) {
        throw new Error('Amount must be a positive number');
      }
      return num;
    })
  ),
  metadata: z.object({
    type: z.string().optional(),
    planName: z.string().optional(),
    isAnnual: z.boolean().optional(),
  }).optional(),
});
