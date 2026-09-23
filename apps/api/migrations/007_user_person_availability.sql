-- Kullanıcının "bulunabilirlik" bayrağı: açıkken kullanıcı, kayıt formundaki
-- karar veren / şahit önerilerinde (persons ile birlikte) listelenir. Varsayılan
-- olarak kapalıdır; persons tablosuna fiziksel kopya YAZILMAZ, öneri birleşimde
-- (persons ∪ available_as_person=true kullanıcılar) hesaplanır.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS available_as_person boolean NOT NULL DEFAULT false;
