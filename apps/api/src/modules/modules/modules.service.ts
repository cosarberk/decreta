import { AppError } from '../../lib/index.js';
import { modulesRepository, type ModuleRow, type ModuleWithUsage } from './modules.repository.js';

export const modulesService = {
  async list(): Promise<ModuleWithUsage[]> {
    return modulesRepository.listWithUsage();
  },

  async create(name: string, description?: string | null): Promise<ModuleRow> {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      throw AppError.badRequest('Modül adı boş olamaz');
    }
    const existing = await modulesRepository.findByName(trimmed);
    if (existing) {
      throw AppError.conflict('Bu modül zaten var', 'MODULE_EXISTS');
    }
    return modulesRepository.create(trimmed, description?.trim() || null);
  },

  async update(id: string, name: string, description?: string | null): Promise<ModuleRow> {
    const trimmed = name.trim();
    if (trimmed.length === 0) throw AppError.badRequest('Modül adı boş olamaz');
    const dup = await modulesRepository.findByName(trimmed);
    if (dup && dup.id !== id) throw AppError.conflict('Bu modül zaten var', 'MODULE_EXISTS');
    const updated = await modulesRepository.update(id, trimmed, description?.trim() || null);
    if (!updated) throw AppError.notFound('Modül bulunamadı');
    return updated;
  },

  /** `fromId` modülünü `toId` ile birleştirir: kullanımları taşır, kaynağı siler. */
  async merge(fromId: string, toId: string): Promise<{ name: string; into: string }> {
    if (fromId === toId) throw AppError.badRequest('Bir modül kendisiyle birleştirilemez');
    const from = await modulesRepository.findById(fromId);
    const to = await modulesRepository.findById(toId);
    if (!from || !to) throw AppError.notFound('Modül bulunamadı');
    await modulesRepository.mergeInto(fromId, toId);
    return { name: from.name, into: to.name };
  },

  async remove(id: string): Promise<string> {
    const module = await modulesRepository.findById(id);
    if (!module) throw AppError.notFound('Modül bulunamadı');
    const usage = await modulesRepository.countUsage(id);
    if (usage > 0) {
      throw AppError.conflict(`Bu modül ${usage} kayıtta kullanılıyor, silinemez`, 'MODULE_IN_USE');
    }
    await modulesRepository.remove(id);
    return module.name;
  },
};
