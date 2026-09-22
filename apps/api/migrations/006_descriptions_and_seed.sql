-- =============================================================================
-- Açıklama (description) alanları + önerilen etiket & link tipi seed'i.
-- Açıklamalar "bu ne anlama geliyor" notudur; herkes anlamını görebilsin diye.
-- =============================================================================

ALTER TABLE modules ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE labels ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE link_types ADD COLUMN IF NOT EXISTS description text;

-- --- Önerilen etiketler ------------------------------------------------------
INSERT INTO labels (name, color, description) VALUES
  ('Müşteri Talebi', '#1f6feb', 'Karar müşteri isteği/talebiyle geldiyse.'),
  ('Kapsam Değişikliği', '#8a5cf6', 'Analizdeki kapsam büyüdü/daraldıysa.'),
  ('Yasal / Uyum', '#8a2b2b', 'Mevzuat/uyum (KVKK vb.) gereği alınan karar.'),
  ('İş Kuralı', '#b45309', 'Bir iş kuralı eklendi/değiştiyse.'),
  ('Mimari Karar', '#1f3a5f', 'Yapısal/teknik yön kararı.'),
  ('DB / Şema', '#7a1f2b', 'Veritabanı şeması/migration etkileyen karar.'),
  ('API Kontratı', '#0e7490', 'Endpoint/sözleşme (contract) değişimi.'),
  ('Güvenlik', '#9a3412', 'Güvenlik gerekçeli karar.'),
  ('Performans', '#4a7a52', 'Performans kaynaklı karar.'),
  ('UX / Tasarım', '#a21caf', 'Arayüz/kullanıcı akışı kararı.'),
  ('Konfig / Ortam', '#6b7280', 'Env/ayar/altyapı kararı.'),
  ('Release / Dağıtım', '#2563eb', 'Sürüm/yayın/dağıtım kararı.'),
  ('Acil / Hotfix', '#dc2626', 'Acil müdahale gerektiren karar.'),
  ('Teknik Borç', '#78716c', 'Bilinçli erteleme / teknik borç.'),
  ('Analiz Revizyonu', '#ca8a04', 'Analiz maddesinin düzeltilmesi.')
ON CONFLICT DO NOTHING;

-- --- Mevcut varsayılan link tiplerinin açıklamaları --------------------------
UPDATE link_types SET description = 'Yeni karar eskisini geçersiz kılar (hedef yürürlükten kalkar).'
  WHERE lower(forward_name) = 'ezer';
UPDATE link_types SET description = 'İçerik başka bir kayda taşındı (hedef yürürlükten kalkar).'
  WHERE lower(forward_name) = 'taşındı';
UPDATE link_types SET description = 'İki karar arasında bağlamsal ilişki; hiçbirini yürürlükten kaldırmaz.'
  WHERE lower(forward_name) = 'i̇lgili' OR lower(forward_name) = 'ilgili';

-- --- Önerilen ek link tipleri ------------------------------------------------
INSERT INTO link_types (forward_name, inverse_name, color, is_supersede, description) VALUES
  ('Revize eder', 'Revize edildi', '#b45309', true, 'Kararın güncellenmiş hâli (hedef yürürlükten kalkar).'),
  ('Bloklar', 'Bloklanır', '#dc2626', false, 'Bu karar diğerini bekletiyor/engelliyor.'),
  ('Bağımlı', 'Bağımlılığı', '#0e7490', false, 'Bu karar diğerine dayanıyor.'),
  ('Uygular', 'Uygulanır', '#4a7a52', false, 'Bir analiz maddesini/kararı hayata geçirir.'),
  ('Açıklar', 'Açıklandı', '#6b7280', false, 'Belirsiz bir kararı netleştirir.'),
  ('Çelişir', 'Çelişir', '#a16207', false, 'İki karar birbiriyle çakışıyor (dikkat).')
ON CONFLICT DO NOTHING;
