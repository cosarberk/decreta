import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api, type RecordFilters } from '../lib/queries';
import { AFFECTS, type Affect, type RecordSummary } from '../lib/types';
import { AffectBadge, LabelChip, StatusBadge } from '../components/atoms';
import { EntityPicker, type PickerItem } from '../components/EntityPicker';
import { useI18n } from '../i18n/I18nContext';
import { formatDate, formatRefNo } from '../lib/format';

const PAGE_SIZE = 20;

const initialFilters: RecordFilters = {
  q: '',
  affects: [],
  labels: [],
  modules: [],
  personId: null,
  createdBy: null,
  status: 'all',
  page: 1,
  pageSize: PAGE_SIZE,
};

export function RecordsPage(): JSX.Element {
  const { t } = useI18n();
  const [filters, setFilters] = useState<RecordFilters>(initialFilters);
  const [searchText, setSearchText] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<PickerItem | null>(null);

  // Arama kutusunu debounce ederek filtreye yansıt.
  useEffect(() => {
    const handle = setTimeout(() => {
      setFilters((prev) => ({ ...prev, q: searchText, page: 1 }));
    }, 250);
    return () => clearTimeout(handle);
  }, [searchText]);

  const labelsQuery = useQuery({ queryKey: ['labels'], queryFn: api.listLabels });
  const modulesQuery = useQuery({ queryKey: ['modules'], queryFn: api.listModules });
  const recordsQuery = useQuery({
    queryKey: ['records', filters],
    queryFn: () => api.searchRecords(filters),
    placeholderData: keepPreviousData,
  });

  const update = (patch: Partial<RecordFilters>): void => {
    setFilters((prev) => ({ ...prev, ...patch, page: 1 }));
  };

  const toggleAffect = (affect: Affect): void => {
    update({
      affects: filters.affects.includes(affect)
        ? filters.affects.filter((a) => a !== affect)
        : [...filters.affects, affect],
    });
  };

  const toggleLabel = (labelId: string): void => {
    update({
      labels: filters.labels.includes(labelId)
        ? filters.labels.filter((id) => id !== labelId)
        : [...filters.labels, labelId],
    });
  };

  const toggleModule = (moduleId: string): void => {
    update({
      modules: filters.modules.includes(moduleId)
        ? filters.modules.filter((id) => id !== moduleId)
        : [...filters.modules, moduleId],
    });
  };

  const selectPerson = (person: PickerItem | null): void => {
    setSelectedPerson(person);
    update({ personId: person?.id ?? null });
  };

  const resetFilters = (): void => {
    setSearchText('');
    setSelectedPerson(null);
    setFilters(initialFilters);
  };

  const hasActiveFilters =
    filters.affects.length > 0 ||
    filters.labels.length > 0 ||
    filters.modules.length > 0 ||
    filters.status !== 'all' ||
    filters.personId !== null ||
    filters.q !== '';

  const fetchPersonItems = async (query: string): Promise<PickerItem[]> => {
    const people = await api.searchPersonsFull(query);
    return people.map((person) => ({ id: person.id, label: person.fullName }));
  };

  const data = recordsQuery.data;

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">{t('records.title')}</h1>
          <p className="page-subtitle">{t('records.subtitle')}</p>
        </div>
        <Link to="/records/new" className="btn btn-primary">
          {t('records.newBtn')}
        </Link>
      </div>

      <div className="records-layout">
        <aside className="card filter-panel">
          <div className="filter-group">
            <span className="filter-group-title">{t('records.status')}</span>
            {(['all', 'active', 'superseded'] as const).map((status) => (
              <label className="filter-check" key={status}>
                <input
                  type="radio"
                  name="status"
                  checked={filters.status === status}
                  onChange={() => update({ status })}
                />
                {status === 'all'
                  ? t('records.statusAll')
                  : status === 'active'
                    ? t('records.statusActive')
                    : t('records.statusSuperseded')}
              </label>
            ))}
          </div>

          <div className="filter-group">
            <span className="filter-group-title">{t('records.affects')}</span>
            {AFFECTS.map((affect) => (
              <label className="filter-check" key={affect}>
                <input
                  type="checkbox"
                  checked={filters.affects.includes(affect)}
                  onChange={() => toggleAffect(affect)}
                />
                <AffectBadge affect={affect} />
              </label>
            ))}
          </div>

          <div className="filter-group">
            <span className="filter-group-title">{t('records.labels')}</span>
            {(labelsQuery.data ?? []).length === 0 && (
              <span className="muted" style={{ fontSize: 12 }}>
                {t('records.noLabels')}
              </span>
            )}
            {(labelsQuery.data ?? []).map((label) => {
              const selected = filters.labels.includes(label.id);
              return (
                <label key={label.id} className={`filter-chip-row${selected ? ' selected' : ''}`}>
                  <input type="checkbox" checked={selected} onChange={() => toggleLabel(label.id)} />
                  <span
                    className="filter-chip-dot"
                    style={label.color ? { background: label.color } : undefined}
                  />
                  <span className="filter-chip-label" title={label.description || label.name}>
                    {label.name}
                  </span>
                  <span className="count">{label.usage_count}</span>
                </label>
              );
            })}
          </div>

          {(modulesQuery.data ?? []).length > 0 && (
            <div className="filter-group">
              <span className="filter-group-title">{t('records.modules')}</span>
              {(modulesQuery.data ?? []).map((module) => {
                const selected = filters.modules.includes(module.id);
                return (
                  <label key={module.id} className={`filter-chip-row${selected ? ' selected' : ''}`}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleModule(module.id)}
                    />
                    <span className="filter-chip-dot" />
                    <span className="filter-chip-label" title={module.description || module.name}>
                      {module.name}
                    </span>
                    <span className="count">{module.usage_count}</span>
                  </label>
                );
              })}
            </div>
          )}

          <div className="filter-group">
            <span className="filter-group-title">{t('records.person')}</span>
            <EntityPicker
              value={selectedPerson}
              onChange={selectPerson}
              fetchItems={fetchPersonItems}
              placeholder={t('records.personPlaceholder')}
            />
            <span className="muted" style={{ fontSize: 11 }}>
              {t('records.personHint')}
            </span>
          </div>

          {hasActiveFilters && (
            <button type="button" className="btn btn-ghost btn-sm filter-reset" onClick={resetFilters}>
              {t('records.clearFilters')}
            </button>
          )}
        </aside>

        <section>
          <div className="records-toolbar">
            <div className="search-box">
              <span className="search-icon">⌕</span>
              <input
                className="input"
                placeholder={t('records.searchPlaceholder')}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
            <span className="result-count">
              {data ? t('records.count', { n: data.total }) : '—'}
            </span>
          </div>

          {recordsQuery.isLoading ? (
            <div className="card state-block">{t('common.loading')}</div>
          ) : recordsQuery.isError ? (
            <div className="card state-block">{t('records.loadError')}</div>
          ) : data && data.items.length > 0 ? (
            <>
              <div className="record-list">
                {data.items.map((record) => (
                  <RecordRow key={record.id} record={record} />
                ))}
              </div>
              <Pagination
                page={data.page}
                pageCount={data.pageCount}
                onChange={(page) => setFilters((prev) => ({ ...prev, page }))}
              />
            </>
          ) : (
            <div className="card state-block">{t('records.empty')}</div>
          )}
        </section>
      </div>
    </>
  );
}

function RecordRow({ record }: { record: RecordSummary }): JSX.Element {
  const { t } = useI18n();
  const superseded = record.isSuperseded;
  return (
    <Link to={`/records/${record.id}`} className="card record-card">
      <div className="record-card-top">
        <span className="ref-no">{formatRefNo(record.refNo)}</span>
        <StatusBadge superseded={superseded} />
        <span className="affects-row">
          {record.affects.map((affect) => (
            <AffectBadge key={affect} affect={affect} />
          ))}
        </span>
      </div>
      <div className="record-card-decision">{record.decision}</div>
      <div className="record-card-rationale">{record.rationale}</div>
      <div className="record-card-meta">
        <span>{record.createdBy.fullName}</span>
        <span className="dot" />
        <span>{formatDate(record.createdAt)}</span>
        {record.deciders.length > 0 && (
          <>
            <span className="dot" />
            <span>{t('records.decidersCount', { n: record.deciders.length })}</span>
          </>
        )}
        {record.labels.length > 0 && (
          <span className="labels-row">
            {record.labels.map((label) => (
              <LabelChip key={label.id} label={label} />
            ))}
          </span>
        )}
      </div>
    </Link>
  );
}

function Pagination({
  page,
  pageCount,
  onChange,
}: {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
}): JSX.Element | null {
  const { t } = useI18n();
  const pages = useMemo(() => ({ prev: page > 1, next: page < pageCount }), [page, pageCount]);
  if (pageCount <= 1) return null;
  return (
    <div className="pagination">
      <button
        type="button"
        className="btn btn-sm"
        disabled={!pages.prev}
        onClick={() => onChange(page - 1)}
      >
        {t('records.prev')}
      </button>
      <span className="page-info">
        {page} / {pageCount}
      </span>
      <button
        type="button"
        className="btn btn-sm"
        disabled={!pages.next}
        onClick={() => onChange(page + 1)}
      >
        {t('records.next')}
      </button>
    </div>
  );
}
