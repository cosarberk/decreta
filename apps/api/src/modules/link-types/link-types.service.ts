import { AppError } from '../../lib/index.js';
import { linkTypesRepository, type LinkTypeRow } from './link-types.repository.js';

export const linkTypesService = {
  async list(): Promise<LinkTypeRow[]> {
    return linkTypesRepository.list();
  },

  async create(input: {
    forwardName: string;
    inverseName: string;
    color?: string | null;
    isSupersede: boolean;
    description?: string | null;
  }): Promise<LinkTypeRow> {
    const forwardName = input.forwardName.trim();
    const inverseName = input.inverseName.trim();
    if (forwardName.length === 0 || inverseName.length === 0) {
      throw AppError.badRequest('İleri ve ters yön adı zorunlu');
    }
    const existing = await linkTypesRepository.findByForwardName(forwardName);
    if (existing) {
      throw AppError.conflict('Bu link tipi zaten var', 'LINK_TYPE_EXISTS');
    }
    return linkTypesRepository.create({
      forwardName,
      inverseName,
      color: input.color ?? null,
      isSupersede: input.isSupersede,
      description: input.description?.trim() || null,
    });
  },

  async merge(fromId: string, toId: string): Promise<{ name: string; into: string }> {
    if (fromId === toId) throw AppError.badRequest('Bir link tipi kendisiyle birleştirilemez');
    const from = await linkTypesRepository.findById(fromId);
    const to = await linkTypesRepository.findById(toId);
    if (!from || !to) throw AppError.notFound('Link tipi bulunamadı');
    await linkTypesRepository.mergeInto(fromId, toId);
    return { name: from.forward_name, into: to.forward_name };
  },

  async update(
    id: string,
    input: {
      forwardName: string;
      inverseName: string;
      color?: string | null;
      isSupersede: boolean;
      description?: string | null;
    },
  ): Promise<LinkTypeRow> {
    const forwardName = input.forwardName.trim();
    const inverseName = input.inverseName.trim();
    if (forwardName.length === 0 || inverseName.length === 0) {
      throw AppError.badRequest('İleri ve ters yön adı zorunlu');
    }
    const dup = await linkTypesRepository.findByForwardName(forwardName);
    if (dup && dup.id !== id) throw AppError.conflict('Bu link tipi zaten var', 'LINK_TYPE_EXISTS');
    const updated = await linkTypesRepository.update(id, {
      forwardName,
      inverseName,
      color: input.color ?? null,
      isSupersede: input.isSupersede,
      description: input.description?.trim() || null,
    });
    if (!updated) throw AppError.notFound('Link tipi bulunamadı');
    return updated;
  },

  /** Kullanımda olmayan bir link tipini siler; kullanılıyorsa engeller. */
  async remove(id: string): Promise<string> {
    const type = await linkTypesRepository.findById(id);
    if (!type) throw AppError.notFound('Link tipi bulunamadı');
    const usage = await linkTypesRepository.countUsage(id);
    if (usage > 0) {
      throw AppError.conflict(
        `Bu tip ${usage} bağlantıda kullanılıyor, silinemez`,
        'LINK_TYPE_IN_USE',
      );
    }
    await linkTypesRepository.remove(id);
    return type.forward_name;
  },
};
