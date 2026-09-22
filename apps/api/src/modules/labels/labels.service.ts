import { AppError } from '../../lib/index.js';
import { labelsRepository, type LabelRow, type LabelWithUsage } from './labels.repository.js';

/** Basit hex renk doğrulaması (örn. #1f6feb). */
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export const labelsService = {
  async list(): Promise<LabelWithUsage[]> {
    return labelsRepository.listWithUsage();
  },

  async create(name: string, color?: string | null, description?: string | null): Promise<LabelRow> {
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
    return labelsRepository.create(trimmed, color ?? null, description?.trim() || null);
  },

  async update(
    id: string,
    name: string,
    color?: string | null,
    description?: string | null,
  ): Promise<LabelRow> {
    const trimmed = name.trim();
    if (trimmed.length === 0) throw AppError.badRequest('Etiket adı boş olamaz');
    if (color && !HEX_COLOR.test(color)) {
      throw AppError.badRequest('Renk #rrggbb biçiminde olmalı');
    }
    const dup = await labelsRepository.findByName(trimmed);
    if (dup && dup.id !== id) throw AppError.conflict('Bu etiket zaten var', 'LABEL_EXISTS');
    const updated = await labelsRepository.update(id, trimmed, color ?? null, description?.trim() || null);
    if (!updated) throw AppError.notFound('Etiket bulunamadı');
    return updated;
  },

  async merge(fromId: string, toId: string): Promise<{ name: string; into: string }> {
    if (fromId === toId) throw AppError.badRequest('Bir etiket kendisiyle birleştirilemez');
    const from = await labelsRepository.findById(fromId);
    const to = await labelsRepository.findById(toId);
    if (!from || !to) throw AppError.notFound('Etiket bulunamadı');
    await labelsRepository.mergeInto(fromId, toId);
    return { name: from.name, into: to.name };
  },

  async remove(id: string): Promise<string> {
    const label = await labelsRepository.findById(id);
    if (!label) throw AppError.notFound('Etiket bulunamadı');
    const usage = await labelsRepository.countUsage(id);
    if (usage > 0) {
      throw AppError.conflict(`Bu etiket ${usage} kayıtta kullanılıyor, silinemez`, 'LABEL_IN_USE');
    }
    await labelsRepository.remove(id);
    return label.name;
  },
};
