import { z } from 'zod';

/** Bir kaydın etkileyebileceği alanlar — kaydın açılma eşiği bu üç boyuttur. */
export const AFFECT_VALUES = ['analiz', 'test', 'kod'] as const;
export const affectEnum = z.enum(AFFECT_VALUES);

/** Query string'te virgülle gelen değerleri diziye çevirir. */
const csvArray = z.preprocess((value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
  }
  return [];
}, z.array(z.string()));

const linkInputSchema = z.object({
  toRecordId: z.string().uuid(),
  linkTypeId: z.string().uuid(),
});

export const createRecordSchema = z.object({
  decision: z.string().trim().min(1, 'Karar metni zorunlu'),
  rationale: z.string().trim().min(1, 'Gerekçe zorunlu'),
  affects: z.array(affectEnum).min(1, 'En az bir etkilenen alan seçin'),
  modules: z.array(z.string().trim().min(1)).default([]),
  witnesses: z.array(z.string().trim().min(1)).default([]),
  deciders: z.array(z.string().trim().min(1)).default([]),
  labels: z.array(z.string().trim().min(1)).default([]),
  links: z.array(linkInputSchema).default([]),
});

export const searchRecordsSchema = z.object({
  q: z.string().default(''),
  affects: csvArray.pipe(z.array(affectEnum)).default([]),
  labels: csvArray.pipe(z.array(z.string().uuid())).default([]),
  modules: csvArray.pipe(z.array(z.string().uuid())).default([]),
  personId: z.string().uuid().optional().nullable(),
  createdBy: z.string().uuid().optional().nullable(),
  dateFrom: z.string().datetime().optional().nullable(),
  dateTo: z.string().datetime().optional().nullable(),
  status: z.enum(['all', 'active', 'superseded']).default('all'),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const recordIdParamsSchema = z.object({
  id: z.string().uuid('Geçersiz kayıt kimliği'),
});

export const addLinkSchema = linkInputSchema;

export const linkParamsSchema = z.object({
  id: z.string().uuid('Geçersiz kayıt kimliği'),
  linkId: z.string().uuid('Geçersiz bağlantı kimliği'),
});
