import type pg from 'pg';
import { pool, withTransaction } from '../../db/index.js';
import { AppError } from '../../lib/index.js';
import { personsRepository } from '../persons/index.js';
import { labelsRepository } from '../labels/index.js';
import { modulesRepository } from '../modules/index.js';
import { linkTypesRepository } from '../link-types/index.js';
import { notificationsService } from '../notifications/notifications.service.js';
import {
  recordsRepository,
  type RecordDetail,
  type RecordSearchFilters,
  type RecordSearchResult,
} from './records.repository.js';

/** Oluşturma anında eklenecek bir bağlantı (hedef kayıt + tip). */
export interface CreateLinkInput {
  toRecordId: string;
  linkTypeId: string;
}

/** Kayıt oluşturma girdisi (kişi/etiket/modül isimle gelir, id'ye çözülür). */
export interface CreateRecordInput {
  decision: string;
  rationale: string;
  affects: string[];
  modules: string[];
  witnesses: string[];
  deciders: string[];
  labels: string[];
  links: CreateLinkInput[];
}

export const recordsService = {
  async search(filters: RecordSearchFilters): Promise<RecordSearchResult> {
    return recordsRepository.search(filters);
  },

  async getById(id: string): Promise<RecordDetail> {
    const record = await recordsRepository.findById(id);
    if (!record) throw AppError.notFound('Kayıt bulunamadı');
    return record;
  },

  /**
   * Yeni bir kayıt açar. Kayıt ve tüm ilişkileri (şahitler, karar verenler,
   * etiketler, modüller, bağlantılar) tek transaction'da yazılır. Kayıtlar
   * append-only olduğundan bu işlem yalnızca ekleme yapar.
   */
  async create(input: CreateRecordInput, createdBy: string): Promise<RecordDetail> {
    await this.validateLinks(input.links);

    const recordId = await withTransaction(async (client) => {
      const id = await recordsRepository.insert(client, {
        decision: input.decision,
        rationale: input.rationale,
        affects: input.affects,
        createdBy,
      });

      await recordsRepository.linkWitnesses(client, id, await resolvePersons(client, input.witnesses));
      await recordsRepository.linkDeciders(client, id, await resolvePersons(client, input.deciders));
      await recordsRepository.linkLabels(client, id, await resolveLabels(client, input.labels));
      await recordsRepository.linkModules(client, id, await resolveModules(client, input.modules));

      for (const link of input.links) {
        if (link.toRecordId === id) continue;
        await recordsRepository.addLink(client, {
          fromRecord: id,
          toRecord: link.toRecordId,
          linkTypeId: link.linkTypeId,
          createdBy,
        });
      }
      return id;
    });

    const record = await this.getById(recordId);
    notificationsService.notifyRecordCreated(record, createdBy);
    return record;
  },

  /** Var olan bir kayda sonradan bağlantı ekler (detay sayfasından). */
  async addLink(
    recordId: string,
    input: CreateLinkInput,
    actor: { id: string; fullName: string },
  ): Promise<RecordDetail> {
    if (input.toRecordId === recordId) {
      throw AppError.badRequest('Bir kayıt kendisine bağlanamaz', 'SELF_LINK');
    }
    if (!(await recordsRepository.exists(recordId))) {
      throw AppError.notFound('Kayıt bulunamadı');
    }
    await this.validateLinks([input]);
    await recordsRepository.addLink(pool, {
      fromRecord: recordId,
      toRecord: input.toRecordId,
      linkTypeId: input.linkTypeId,
      createdBy: actor.id,
    });
    const record = await this.getById(recordId);
    notificationsService.notifyLinkAdded(record, actor.fullName, actor.id);
    return record;
  },

  async removeLink(linkId: string): Promise<void> {
    const removed = await recordsRepository.removeLink(linkId);
    if (!removed) throw AppError.notFound('Bağlantı bulunamadı');
  },

  /** Bağlantı hedeflerinin ve tiplerinin gerçekten var olduğunu doğrular. */
  async validateLinks(links: readonly CreateLinkInput[]): Promise<void> {
    for (const link of links) {
      if (!(await recordsRepository.exists(link.toRecordId))) {
        throw AppError.badRequest('Bağlanan kayıt bulunamadı', 'BAD_LINK_TARGET');
      }
      if (!(await linkTypesRepository.findById(link.linkTypeId))) {
        throw AppError.badRequest('Bağlantı tipi bulunamadı', 'BAD_LINK_TYPE');
      }
    }
  },
};

async function resolvePersons(client: pg.PoolClient, names: readonly string[]): Promise<string[]> {
  const ids: string[] = [];
  for (const name of uniqueTrimmed(names)) {
    ids.push(await personsRepository.findOrCreate(client, name));
  }
  return ids;
}

async function resolveLabels(client: pg.PoolClient, names: readonly string[]): Promise<string[]> {
  const ids: string[] = [];
  for (const name of uniqueTrimmed(names)) {
    ids.push(await labelsRepository.findOrCreate(client, name));
  }
  return ids;
}

async function resolveModules(client: pg.PoolClient, names: readonly string[]): Promise<string[]> {
  const ids: string[] = [];
  for (const name of uniqueTrimmed(names)) {
    ids.push(await modulesRepository.findOrCreate(client, name));
  }
  return ids;
}

/** Kırpar, boşları atar ve büyük/küçük harf duyarsız tekilleştirir. */
function uniqueTrimmed(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (trimmed.length === 0) continue;
    const key = trimmed.toLocaleLowerCase('tr');
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}
