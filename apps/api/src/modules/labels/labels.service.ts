import { AppError } from '../../lib/index.js';
import { labelsRepository, type LabelRow, type LabelWithUsage } from './labels.repository.js';

/** Basit hex renk doğrulaması (örn. #1f6feb). */
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export const labelsService = {
  async list(): Promise<LabelWithUsage[]> {
    return labelsRepository.listWithUsage();
  },

  async create(name: string, color?: string | null): Promise<LabelRow> {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      throw AppError.badRequest('Etiket adı boş olamaz');
    }
    if (color && !HEX_COLOR.test(color)) {
      throw AppError.badRequest('Renk #rrggbb biçiminde olmalı');
    }
    const existing = await labelsRepository.findByName(trimmed);
    if (existing) {
      throw AppError.conflict('Bu etiket zaten var', 'LABEL_EXISTS');
    }
    return labelsRepository.create(trimmed, color ?? null);
  },
};
