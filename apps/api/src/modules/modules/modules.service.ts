import { AppError } from '../../lib/index.js';
import { modulesRepository, type ModuleRow, type ModuleWithUsage } from './modules.repository.js';

export const modulesService = {
  async list(): Promise<ModuleWithUsage[]> {
    return modulesRepository.listWithUsage();
  },

  async create(name: string): Promise<ModuleRow> {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      throw AppError.badRequest('Modül adı boş olamaz');
    }
    const existing = await modulesRepository.findByName(trimmed);
    if (existing) {
      throw AppError.conflict('Bu modül zaten var', 'MODULE_EXISTS');
    }
    return modulesRepository.create(trimmed);
  },

  async update(id: string, name: string): Promise<ModuleRow> {
    const trimmed = name.trim();
    if (trimmed.length === 0) throw AppError.badRequest('Modül adı boş olamaz');
    const dup = await modulesRepository.findByName(trimmed);
    if (dup && dup.id !== id) throw AppError.conflict('Bu modül zaten var', 'MODULE_EXISTS');
    const updated = await modulesRepository.update(id, trimmed);
    if (!updated) throw AppError.notFound('Modül bulunamadı');
    return updated;
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
