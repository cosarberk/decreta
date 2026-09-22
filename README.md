# Decreta

**Analiz, test ve kodu etkileyen kararların değiştirilemez (append-only) resmî kayıt defteri.**

Decreta, bir projede "bu neden böyle?" sorusunun 9 ay sonra bile kanıtıyla
cevaplanabilmesi için kurulur. Bir kararı ezen, bir analizi değiştiren, bir
işi başlatan her talimat; kim verdi, kim onayladı, neden — hepsi tarihli ve
**silinemez** bir iz olarak kaydedilir.

## Temel ilke: append-only

Kayıtlar bir kez açıldıktan sonra **düzenlenemez ve silinemez** (veritabanı
seviyesinde trigger ile de garanti altındadır). Bir karar değişince eski kayıt
düzeltilmez; onu _ezen_ (`supersedes`) yeni bir kayıt açılır. Böylece
"PO şöyle dedi → tasarım müdürü sonra değiştirdi" zincirinin tamamı korunur.

## Kayıt alanları

- **Karar** ve **gerekçe**
- **Etkilenen alan**: analiz / test / kod (kaydın açılma eşiği bu üç boyuttur)
- **Karar verenler** (çoklu) ve **şahitler** (çoklu) — ünvansız, isim soyisim
- **Dinamik etiketler** (Jira label mantığı, filtrelenebilir)
- **Ezme bağı** (`supersedes`) — kanıt zinciri

## Mimari

```
apps/
  api/   Node.js + TypeScript + Fastify + PostgreSQL (katmanlı: route → service → repository)
  web/   React + TypeScript + Vite + TanStack Query
```

- **Dev**: her servis ayrı konteynerde, canlı yeniden yükleme (docker-compose).
- **Publish (main)**: web statik derlenir, API onu da servis eder → **tek image**
  (kök `Dockerfile`).
- **Arama**: PostgreSQL full-text (`turkish` config) + `pg_trgm` + faceted
  filtreler. Elastic'e gerek yok; arama katmanı gerekirse değiştirilebilir.

## Çalıştırma (geliştirme)

```bash
cp .env.example .env      # gerekirse portları düzenleyin
npm run dev               # docker compose up --build
```

- Web:  http://localhost:5173
- API:  http://localhost:4000/api
- İlk yönetici (.env'den): `admin@decreta.local` / `admin`

Durdurmak için `npm run dev:down`, veritabanını da sıfırlamak için
`npm run dev:reset`.

## Üretim imajı (tek image)

```bash
npm run build             # docker build -t decreta:latest .
npm run start             # docker run -p 4000:4000 --env-file .env decreta:latest
```

Bu imajda web ve API aynı porttan (4000) servis edilir.

## Ortam değişkenleri

Bkz. `.env.example`. Üretimde en azından `JWT_SECRET` ve
`BOOTSTRAP_ADMIN_PASSWORD` değiştirilmelidir.
