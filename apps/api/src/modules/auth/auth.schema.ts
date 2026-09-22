import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Geçerli bir e-posta girin'),
  password: z.string().min(1, 'Parola zorunlu'),
});

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(1, 'İsim soyisim zorunlu'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Mevcut parola zorunlu'),
  newPassword: z.string().min(6, 'Yeni parola en az 6 karakter olmalı'),
});

export type LoginInput = z.infer<typeof loginSchema>;
