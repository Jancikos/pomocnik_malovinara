# Vinársky Pomocník

Mobilne orientovaná full-stack aplikácia pre evidenciu vín, nádob, výrobných šarží, meraní, zásahov a presunov v malej pivnici.

## Architektúra

Aplikácia používa Nuxt 4 pre Vue frontend aj Nitro API. Aplikačné dáta sú uložené iba v serverovej SQLite databáze cez Drizzle ORM.

```text
Nuxt page → composable → Nitro API → service → repository → Drizzle → SQLite
```

Doménové enumy a DTO sú v `shared/`. Business pravidlá a transakcie sú v `server/services/`, databázové dotazy v `server/repositories/` a schéma v `server/database/schema.ts`.

## Lokálny vývoj

Požiadavka: Node.js 22.18 alebo novší.

```sh
npm ci
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
```

Demo účet:

```text
oskar@example.sk
vino2026
```

Prihlásenie používa serverovú session a HTTP-only cookie. Dáta každej požiadavky sú na serveri scopeované cez membership používateľa v pivnici.

## Databáza a migrácie

Cestu určuje `DATABASE_URL`. Vývojová hodnota je `./data/dev.sqlite`. Pre produkciu použite cestu na persistentnom filesysteme mimo repozitára a mimo `.output`, napríklad:

```env
DATABASE_URL=/var/lib/vinarsky-pomocnik/database.sqlite
```

Novú migráciu vytvorí `npm run db:generate`, existujúce migrácie aplikuje `npm run db:migrate`. SQLite používa foreign keys, busy timeout a WAL režim.

## Overenie

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

Testy pokrývajú generovanie ID, append-only merania, latest-per-type, uzavretie, odkalenie, single aj multi-destination stáčanie, objemovú bilanciu, kapacitu, lineage a ochranu force delete.

## Hlavné API

- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET /api/cellar/dashboard`
- `GET|POST /api/wines`, `GET /api/wines/:id`
- `GET|POST /api/vessels`, `GET|PATCH /api/vessels/:id`
- `GET|POST /api/batches`, `GET|DELETE /api/batches/:id`
- `POST /api/batches/:id/close`
- `GET|POST /api/batches/:id/measurements`
- `POST /api/batches/:id/interventions`
- `POST /api/transfers`

`DELETE /api/batches/:id` vyžaduje potvrdenie `FORCE DELETE` a odmietne vymazanie šarže s históriou alebo následníkmi.

## Produkčné spustenie

Projekt cieli na jeden klasický Node/Nitro server a jeden SQLite súbor na persistentnom filesysteme:

```sh
npm ci
npm run db:migrate
npm run build
node .output/server/index.mjs
```