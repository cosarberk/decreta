import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email('Geçerli bir e-posta girin'),
  password: z.string().min(6, 'Parola en az 6 karakter olmalı'),
  fullName: z.string().trim().min(1, 'İsim soyisim zorunlu'),
  role: z.enum(['admin', 'user']).default('user'),
});

export const setActiveSchema = z.object({
  isActive: z.boolean(),
});

export const setRoleSchema = z.object({
  role: z.enum(['admin', 'user']),
});

export const setAvailabilitySchema = z.object({
  available: z.boolean(),
});

export const userIdParamsSchema = z.object({
  id: z.string().uuid('Geçersiz kullanıcı kimliği'),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
