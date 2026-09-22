import { useState } from 'react';
import { api } from '../lib/queries';
import type { LinkType } from '../lib/types';
import { EntityPicker, type PickerItem } from './EntityPicker';
import { useI18n } from '../i18n/I18nContext';
import { formatRefNo } from '../lib/format';

export interface AddLinkPayload {
  toRecordId: string;
  linkTypeId: string;
  recordLabel: string;
  typeLabel: string;
}

interface LinkComposerProps {
  linkTypes: LinkType[];
  excludeIds: string[];
  onAdd: (payload: AddLinkPayload) => void | Promise<void>;
  busy?: boolean;
}

/** "Bağlantı ekle" satırı: hedef kaydı ara + tip seç + ekle. */
export function LinkComposer({ linkTypes, excludeIds, onAdd, busy }: LinkComposerProps): JSX.Element {
  const { t } = useI18n();
  const [record, setRecord] = useState<PickerItem | null>(null);
  const [typeId, setTypeId] = useState<string>(linkTypes[0]?.id ?? '');

  const fetchRecords = async (query: string): Promise<PickerItem[]> => {
    const result = await api.searchRecords({
      q: query,
      affects: [],
      labels: [],
      modules: [],
      personId: null,
      createdBy: null,
      status: 'all',
      page: 1,
      pageSize: 8,
    });
    return result.items
      .filter((item) => !excludeIds.includes(item.id))
      .map((item) => ({ id: item.id, label: `${formatRefNo(item.refNo)} — ${item.decision.slice(0, 60)}` }));
  };

  const handleAdd = async (): Promise<void> => {
    const type = linkTypes.find((t) => t.id === typeId);
    if (!record || !type) return;
    await onAdd({
      toRecordId: record.id,
      linkTypeId: type.id,
      recordLabel: record.label,
      typeLabel: type.forward_name,
    });
    setRecord(null);
  };

  return (
    <div className="link-composer">
      <select
        className="select"
        style={{ maxWidth: 150 }}
        value={typeId}
        onChange={(e) => setTypeId(e.target.value)}
      >
        {linkTypes.map((type) => (
          <option key={type.id} value={type.id}>
            {type.forward_name}
          </option>
        ))}
      </select>
      <div style={{ flex: 1 }}>
        <EntityPicker
          value={record}
          onChange={setRecord}
          fetchItems={fetchRecords}
          placeholder={t('linkComposer.placeholder')}
        />
      </div>
      <button
        type="button"
        className="btn btn-primary btn-sm"
        onClick={handleAdd}
        disabled={!record || !typeId || busy}
      >
        {t('common.add')}
      </button>
    </div>
  );
}
