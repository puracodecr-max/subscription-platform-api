import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().email(),
  password: z.string().min(1)
});

export type LoginInput = z.infer<typeof loginSchema>;
