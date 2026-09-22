import { z } from 'zod';

export const searchPersonsSchema = z.object({
  q: z.string().default(''),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

export const createPersonSchema = z.object({
  fullName: z.string().trim().min(1, 'İsim soyisim zorunlu'),
});
