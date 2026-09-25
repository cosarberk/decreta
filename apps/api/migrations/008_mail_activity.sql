-- =============================================================================
-- Mail (bildirim) gönderimlerinin denetim kaydı.
-- Gönderim başına activity_log'a tek bir 'mail_sent' satırı yazılır; kişi başı
-- sonuç (kime iletildi / kime iletilemedi) `details` içinde JSON olarak tutulur.
-- Yalnızca mail olaylarında dolar, diğer olaylarda NULL kalır.
--   details şekli: [{ "email": "..", "name": "..", "ok": true|false, "error": ".." }]
-- =============================================================================
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS details jsonb;
