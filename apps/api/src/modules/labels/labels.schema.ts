import { z } from 'zod';

export const createLabelSchema = z.object({
  name: z.string().trim().min(1, 'Etiket adı zorunlu').max(40, 'Etiket adı çok uzun'),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Renk #rrggbb biçiminde olmalı')
    .optional(),
});
