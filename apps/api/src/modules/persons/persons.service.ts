import { AppError } from '../../lib/index.js';
import { usersRepository } from '../users/users.repository.js';
import { personsRepository, type PersonRow } from './persons.repository.js';

export const personsService = {
  async search(term: string, limit = 20): Promise<PersonRow[]> {
    return personsRepository.search(term, Math.min(Math.max(limit, 1), 50));
  },

  /**
   * Karar veren/şahit önerisi: mevcut kişiler (persons) ile bulunabilirliği
   * açık kullanıcıların (users) isimlerini birleştirir. Kullanıcılar üstte,
   * aynı isim iki yerde varsa Türkçe büyük/küçük harf duyarsız tekilleştirilir.
   */
  async searchSuggestions(term: string, limit = 20): Promise<string[]> {
    const capped = Math.min(Math.max(limit, 1), 50);
    const [userNames, persons] = await Promise.all([
      usersRepository.searchAvailableNames(term, capped),
      personsRepository.search(term, capped),
    ]);
    const seen = new Set<string>();
    const merged: string[] = [];
    for (const name of [...userNames, ...persons.map((p) => p.full_name)]) {
      const key = name.toLocaleLowerCase('tr');
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(name);
      if (merged.length >= capped) break;
    }
    return merged;
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
