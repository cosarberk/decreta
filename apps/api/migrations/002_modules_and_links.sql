-- =============================================================================
-- Decreta — modüller + Jira tarzı kayıt linkleme.
-- "Etkilenen parça" artık dinamik modüllere (çoklu) bağlanır.
-- Tekil "ezme" (supersedes_id) kaldırılır; yerine tipli, çoklu record_links
-- gelir. "Ezme/taşınma" yalnızca bir link tipidir; hedefin "ezilmiş" durumu
-- bu bağlardan OTOMATİK türetilir. Kayıtlar değişmez kalır; linkler ise
-- (değişmezliğin düzeltme mekanizması olarak) sonradan da eklenip çıkarılabilir.
-- =============================================================================

-- --- Modüller (admin tarafından tanımlanır) ---------------------------------
CREATE TABLE IF NOT EXISTS modules (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS modules_name_key ON modules (lower(name));

CREATE TABLE IF NOT EXISTS record_modules (
  record_id uuid NOT NULL REFERENCES records (id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES modules (id),
  PRIMARY KEY (record_id, module_id)
);
CREATE INDEX IF NOT EXISTS record_modules_module ON record_modules (module_id);

-- --- Link tipleri (dinamik) --------------------------------------------------
-- forward_name: kaynaktan bakınca ("Ezer"), inverse_name: hedeften bakınca
-- ("Ezildi"). is_supersede=true ise hedef kayıt "yürürlükten kalkmış" sayılır.
CREATE TABLE IF NOT EXISTS link_types (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  forward_name text NOT NULL,
  inverse_name text NOT NULL,
  color        text,
  is_supersede boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS link_types_forward_key ON link_types (lower(forward_name));

-- --- Kayıt linkleri (yönlü, tipli) ------------------------------------------
CREATE TABLE IF NOT EXISTS record_links (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_record  uuid NOT NULL REFERENCES records (id) ON DELETE CASCADE,
  to_record    uuid NOT NULL REFERENCES records (id) ON DELETE CASCADE,
  link_type_id uuid NOT NULL REFERENCES link_types (id),
  created_by   uuid NOT NULL REFERENCES users (id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT record_links_no_self CHECK (from_record <> to_record),
  CONSTRAINT record_links_unique UNIQUE (from_record, to_record, link_type_id)
);
CREATE INDEX IF NOT EXISTS record_links_from ON record_links (from_record);
CREATE INDEX IF NOT EXISTS record_links_to ON record_links (to_record);

-- --- Varsayılan link tipleri (admin sonradan ekleyip düzenleyebilir) --------
INSERT INTO link_types (forward_name, inverse_name, color, is_supersede)
VALUES
  ('Ezer', 'Ezildi', '#8a2b2b', true),
  ('Taşındı', 'Buradan taşındı', '#8a6420', true),
  ('İlgili', 'İlgili', '#33518f', false)
ON CONFLICT DO NOTHING;

-- --- Eski tekil ezme alanını kaldır -----------------------------------------
DROP INDEX IF EXISTS records_supersedes;
ALTER TABLE records DROP COLUMN IF EXISTS supersedes_id;

-- --- affected_detail'i kaldır (yerini modüller aldı) ------------------------
-- search_tsv bu sütuna bağlı olduğundan önce düşürülüp yeniden kurulur.
DROP INDEX IF EXISTS records_search_tsv;
ALTER TABLE records DROP COLUMN IF EXISTS search_tsv;
ALTER TABLE records DROP COLUMN IF EXISTS affected_detail;
ALTER TABLE records ADD COLUMN search_tsv tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('turkish', coalesce(decision, '')), 'A') ||
  setweight(to_tsvector('turkish', coalesce(rationale, '')), 'B')
) STORED;
CREATE INDEX IF NOT EXISTS records_search_tsv ON records USING gin (search_tsv);
