-- =============================================================================
-- Decreta — ilk şema.
-- Tasarım ilkesi: kayıtlar DEĞİŞTİRİLEMEZ (append-only). Bir karar değişince
-- eski kayıt düzenlenmez/silinmez; onu "ezen" (supersedes) yeni bir kayıt açılır.
-- Böylece "bu neden böyle?" sorusunun kanıt zinciri hiç bozulmadan korunur.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- --- Sistem kullanıcıları (login) -------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  full_name     text NOT NULL,                    -- ünvan yok: yalnızca isim soyisim
  role          text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- --- Kişiler (şahit / karar veren havuzu) -----------------------------------
-- Sistemde login'i olmayan kişiler de burada temsil edilir. Ünvan tutulmaz.
CREATE TABLE IF NOT EXISTS persons (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name  text NOT NULL,                        -- isim soyisim
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS persons_full_name_key ON persons (lower(full_name));
CREATE INDEX IF NOT EXISTS persons_full_name_trgm ON persons USING gin (full_name gin_trgm_ops);

-- --- Dinamik etiketler (Jira label mantığı) ---------------------------------
CREATE TABLE IF NOT EXISTS labels (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  color      text,                                 -- opsiyonel görsel renk (hex)
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS labels_name_key ON labels (lower(name));

-- --- Kayıtlar (asıl "resmî gazete" defteri) ---------------------------------
CREATE TABLE IF NOT EXISTS records (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_no          bigint GENERATED ALWAYS AS IDENTITY,   -- insan okunur sıra no
  decision        text NOT NULL,                         -- karar
  rationale       text NOT NULL,                         -- gerekçe
  affects         text[] NOT NULL DEFAULT '{}',          -- neyi etkiliyor: analiz/test/kod
  affected_detail text,                                  -- hangi parça (modül/analiz maddesi)
  created_by      uuid NOT NULL REFERENCES users (id),   -- kaydı açan
  supersedes_id   uuid REFERENCES records (id),          -- ezdiği önceki kayıt (zincir)
  created_at      timestamptz NOT NULL DEFAULT now(),
  search_tsv      tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('turkish', coalesce(decision, '')), 'A') ||
    setweight(to_tsvector('turkish', coalesce(rationale, '')), 'B') ||
    setweight(to_tsvector('turkish', coalesce(affected_detail, '')), 'C')
  ) STORED
);
CREATE UNIQUE INDEX IF NOT EXISTS records_ref_no_key ON records (ref_no);
CREATE INDEX IF NOT EXISTS records_search_tsv ON records USING gin (search_tsv);
CREATE INDEX IF NOT EXISTS records_decision_trgm ON records USING gin (decision gin_trgm_ops);
CREATE INDEX IF NOT EXISTS records_created_at ON records (created_at DESC);
CREATE INDEX IF NOT EXISTS records_created_by ON records (created_by);
CREATE INDEX IF NOT EXISTS records_supersedes ON records (supersedes_id);
CREATE INDEX IF NOT EXISTS records_affects ON records USING gin (affects);

-- --- Çoklu şahitler ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS record_witnesses (
  record_id uuid NOT NULL REFERENCES records (id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES persons (id),
  PRIMARY KEY (record_id, person_id)
);
CREATE INDEX IF NOT EXISTS record_witnesses_person ON record_witnesses (person_id);

-- --- Çoklu karar verenler ----------------------------------------------------
CREATE TABLE IF NOT EXISTS record_deciders (
  record_id uuid NOT NULL REFERENCES records (id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES persons (id),
  PRIMARY KEY (record_id, person_id)
);
CREATE INDEX IF NOT EXISTS record_deciders_person ON record_deciders (person_id);

-- --- Kayıt <-> etiket --------------------------------------------------------
CREATE TABLE IF NOT EXISTS record_labels (
  record_id uuid NOT NULL REFERENCES records (id) ON DELETE CASCADE,
  label_id  uuid NOT NULL REFERENCES labels (id) ON DELETE CASCADE,
  PRIMARY KEY (record_id, label_id)
);
CREATE INDEX IF NOT EXISTS record_labels_label ON record_labels (label_id);

-- --- Kayıt değişmezliği (append-only) güvencesi -----------------------------
-- UPDATE ve DELETE veritabanı düzeyinde reddedilir. Uygulama katmanı hata
-- yapsa bile kanıt zinciri bozulamaz.
CREATE OR REPLACE FUNCTION forbid_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'records tablosu append-only: kayıtlar güncellenemez/silinemez';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS records_no_update ON records;
CREATE TRIGGER records_no_update BEFORE UPDATE OR DELETE ON records
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
