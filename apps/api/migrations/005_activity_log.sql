-- =============================================================================
-- Aktivite / denetim kaydı. Olaylar gerçekleştikçe (kayıt açıldı, bağlantı
-- eklendi/kaldırıldı, etiket/modül/kullanıcı değişti...) buraya yazılır.
-- Herkes okuyabilir; append-only iz.
-- =============================================================================
CREATE TABLE IF NOT EXISTS activity_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action      text NOT NULL,          -- 'record_created','link_added','record_superseded',...
  actor_id    uuid,
  actor_name  text NOT NULL,
  target_ref  text,                    -- 'DCR-0007' ya da varlık adı
  target_text text,                    -- karar özeti / ek bilgi
  record_id   uuid,                    -- varsa tıklanabilir kayıt
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS activity_log_created ON activity_log (created_at DESC);
CREATE INDEX IF NOT EXISTS activity_log_action ON activity_log (action);
CREATE INDEX IF NOT EXISTS activity_log_actor ON activity_log (actor_name);
