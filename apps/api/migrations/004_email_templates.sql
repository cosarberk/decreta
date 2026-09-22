-- =============================================================================
-- E-posta şablonları — admin panelinden düzenlenebilir (DB-driven, statik değil).
-- Her olay türü için konu (subject) ve gövde (body_html). Gövde/konu içindeki
-- {{degisken}} yer tutucuları gönderim anında doldurulur. Marka çerçevesi
-- (üst/alt bilgi) kod tarafında sabittir; şablon o çerçevenin İÇİNE yerleşir.
-- =============================================================================
CREATE TABLE IF NOT EXISTS email_templates (
  key        text PRIMARY KEY,
  subject    text NOT NULL,
  body_html  text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO email_templates (key, subject, body_html) VALUES
(
  'record_created',
  'Yeni karar kaydı: {{refNo}}',
  '<p><strong>{{actorName}}</strong> yeni bir karar kaydı açtı:</p>
<p style="font-size:16px;font-weight:600;margin:12px 0">{{decision}}</p>
<p><a href="{{url}}" style="display:inline-block;background:#1f3a5f;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600">Kaydı görüntüle</a></p>'
),
(
  'link_added',
  'Karar bağlantısı eklendi: {{refNo}}',
  '<p><strong>{{actorName}}</strong>, <strong>{{refNo}}</strong> kaydına yeni bir bağlantı ekledi:</p>
<p style="font-size:15px;margin:12px 0">{{decision}}</p>
<p><a href="{{url}}" style="display:inline-block;background:#1f3a5f;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600">Kaydı görüntüle</a></p>'
),
(
  'user_info',
  'Decreta hesap bilgilerin',
  '<p>Merhaba <strong>{{fullName}}</strong>,</p>
<p>Decreta karar kayıt defterinde hesabın bulunuyor:</p>
<table style="margin:12px 0;font-size:14px">
  <tr><td style="color:#8b8d93;padding:2px 12px 2px 0">Kullanıcı adı (e-posta)</td><td><strong>{{email}}</strong></td></tr>
  <tr><td style="color:#8b8d93;padding:2px 12px 2px 0">Ad soyad</td><td>{{fullName}}</td></tr>
  <tr><td style="color:#8b8d93;padding:2px 12px 2px 0">Rol</td><td>{{role}}</td></tr>
</table>
<p>Parolanı bilmiyorsan yöneticinden parola sıfırlama bağlantısı isteyebilirsin.</p>
<p><a href="{{loginUrl}}" style="display:inline-block;background:#1f3a5f;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600">Giriş yap</a></p>'
),
(
  'password_reset',
  'Decreta parola sıfırlama',
  '<p>Merhaba <strong>{{fullName}}</strong>,</p>
<p>Parolanı belirlemek/sıfırlamak için aşağıdaki bağlantıyı kullan. Bağlantı 24 saat geçerlidir.</p>
<p style="margin:16px 0"><a href="{{resetUrl}}" style="display:inline-block;background:#1f3a5f;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600">Parolayı belirle</a></p>
<p style="color:#8b8d93;font-size:12px">Bu isteği sen yapmadıysan bu e-postayı yok sayabilirsin.</p>'
)
ON CONFLICT (key) DO NOTHING;
