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
};
