import { AppError } from '../../lib/index.js';
import { personsRepository, type PersonRow } from './persons.repository.js';

export const personsService = {
  async search(term: string, limit = 20): Promise<PersonRow[]> {
    return personsRepository.search(term, Math.min(Math.max(limit, 1), 50));
  },

  /** Elle yeni kişi ekler; aynı isim varsa mevcut kaydı döndürür. */
  async create(fullName: string): Promise<PersonRow> {
    const trimmed = fullName.trim();
    if (trimmed.length === 0) {
      throw AppError.badRequest('İsim soyisim boş olamaz');
    }
    const existing = await personsRepository.findByName(trimmed);
    return existing ?? personsRepository.create(trimmed);
  },
};
