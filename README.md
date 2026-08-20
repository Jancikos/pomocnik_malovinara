# Vinársky Pomocník

Mobilne orientovaná full-stack aplikácia na evidenciu vín, vstupných surovín, výrobných šarží, ich nádob, meraní, zásahov a presunov v malej pivnici.

## Technológie a architektúra

Projekt používa Nuxt 4 a Vue 3 pre používateľské rozhranie, Nitro pre serverové API, SQLite ako databázu a Drizzle ORM pre databázovú schému a migrácie. Kód je písaný v TypeScripte.

Typický tok požiadavky:

```text
Nuxt stránka → composable → Nitro API → service → repository → Drizzle → SQLite
```

Serverová SQLite databáza je jediný zdroj dát. Prihlásenie používa serverovú session uloženú v HTTP-only cookie. Dáta každej požiadavky sú na serveri obmedzené podľa členstva používateľa v pivnici.

## Štruktúra projektu

```text
app/                         používateľské rozhranie
  assets/                    globálne štýly
  components/                znovupoužiteľné Vue komponenty
  composables/               klientská logika a volania API
  layouts/                   spoločné rozloženie stránok
  middleware/                ochrana stránok a navigácia
  pages/                     stránky a URL aplikácie

server/                      serverová časť
  api/                       HTTP API endpointy
  database/                  pripojenie, schéma, migrácie a seed
  repositories/              databázové dotazy
  services/                  doménové pravidlá a transakcie
  utils/                     autentifikácia a pomocné funkcie

shared/                      typy, enumy a DTO spoločné pre klienta a server
drizzle/migrations/          verzované SQL migrácie
data/                        lokálne SQLite súbory (necommitujú sa)
docs/                        doplnková projektová dokumentácia
public/                      verejné statické súbory
```

### Kde robiť zmeny

- Obrazovky a formuláre upravuj v `app/pages` a `app/components`.
- Klientské volania API patria do `app/composables`.
- Nové HTTP endpointy pridávaj do `server/api`.
- Biznis pravidlá drž v `server/services`, nie vo Vue komponentoch.
- Databázové dotazy patria do `server/repositories`.
- Schému upravuj v `server/database/schema.ts` a zmenu zachyť novou migráciou.
- Spoločné doménové typy, enumy a DTO patria do `shared/`.

## Spustenie na vývoj

Požiadavka: Node.js 22.18 alebo novší a npm.

### Windows PowerShell

```powershell
npm ci
Copy-Item .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
```

### Linux a macOS

```bash
npm ci
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
```

Aplikácia bude dostupná na [http://localhost:3000](http://localhost:3000).

Demo účet vytvorený seedom:

```text
E-mail: oskar@example.sk
Heslo: vino2026
```

Ak už `.env` existuje alebo databáza obsahuje dáta, konfiguráciu a seed netreba opakovať. Po stiahnutí zmien je vhodné znovu spustiť migrácie.

## Konfigurácia a databáza

Lokálne nastavenia sú v súbore `.env`; vzor poskytuje `.env.example`. Premenná `DATABASE_URL` určuje umiestnenie SQLite databázy.

Vývojová hodnota:

```dotenv
DATABASE_URL=./data/dev.sqlite
```

Súbor `.env` ani SQLite databázové súbory necommituj. SQLite používa foreign keys, busy timeout a WAL režim.

Po úprave `server/database/schema.ts` vytvor a aplikuj migráciu:

```powershell
npm run db:generate
npm run db:migrate
```

## Užitočné príkazy

```text
npm run dev          vývojový server s automatickým obnovením
npm run typecheck    kontrola TypeScriptu
npm run lint         kontrola kvality a štýlu kódu
npm test             jednorazové spustenie testov
npm run test:watch   testy vo watch režime
npm run build        produkčný build
npm run preview      lokálna ukážka produkčného buildu
npm run db:generate  vytvorenie migrácie zo zmenenej schémy
npm run db:migrate   aplikovanie databázových migrácií
npm run db:seed      vloženie ukážkových dát
```

Pred odovzdaním zmeny spusti:

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

## Doménové pravidlá

Hlavné entity sú používateľ, pivnica, členstvo, víno, vstupná surovina, šarža, meranie, zásah a presun. Nádoba nie je samostatná entita; jej názov, typ, kapacita a umiestnenie sú snapshotom uloženým priamo v šarži.

Dôležité pravidlá:

- Pri vytvorení každej šarže sa povinne zadáva názov, typ a kapacita nádoby; umiestnenie je voliteľné.
- Počiatočnú fázu šarže používateľ vyberá manuálne už pri jej vytvorení.
- Rovnaký názov nádoby môže mať v pivnici najviac jedna aktívna šarža.
- Merania sú append-only; oprava alebo nová hodnota vytvorí nový záznam.
- Ľubovoľný podporovaný typ merania alebo zásahu možno zaznamenať v ktorejkoľvek fáze aktívnej šarže.
- API vie vrátiť poslednú hodnotu každého typu merania.
- Uzavretie šarže a presuny rešpektujú objem, kapacitu a históriu.
- Presuny obsahu medzi nádobami prebiehajú transakčne.
- `DELETE /api/sarze/:id` vyžaduje potvrdenie `FORCE DELETE` a odmietne vymazanie šarže s históriou alebo následníkmi.

Testy pokrývajú generovanie ID, snapshot nádoby v šarži, ochranu aktívneho názvu nádoby, append-only merania, latest-per-type, uzavretie, odkalenie, single aj multi-ciel stáčanie, objemovú bilanciu, kapacitu, lineage a ochranu force delete.

## Hlavné API

- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET /api/pivnica/prehlad`
- `GET|POST /api/vina`, `GET /api/vina/:id`
- `GET|POST /api/sarze`, `GET|DELETE /api/sarze/:id`
- `POST /api/sarze/:id/uzavriet`
- `GET|POST /api/sarze/:id/merania`
- `POST /api/sarze/:id/zasahy`
- `POST /api/presuny`

## Produkčný build a nasadenie

Projekt je určený pre jednu klasickú Node/Nitro serverovú inštanciu a SQLite súbor na trvalom disku. Nie je vhodný na čisto serverless alebo edge hosting bez perzistentného súborového úložiska.

Základný deployment postup:

```bash
npm ci
npm run db:migrate
npm run build
node .output/server/index.mjs
```

Na serveri nastav minimálne:

- `NODE_ENV=production`
- `DATABASE_URL` na absolútnu cestu k SQLite súboru na trvalom disku
- `HOST` a `PORT` podľa hostingu

Príklad:

```bash
NODE_ENV=production \
DATABASE_URL=/var/lib/vinarsky-pomocnik/database.sqlite \
HOST=0.0.0.0 \
PORT=3000 \
node .output/server/index.mjs
```

Adresár databázy musí existovať a proces aplikácie doň musí mať právo zapisovať. Databázu pravidelne zálohuj. Pri nasadení novej verzie najskôr aplikuj migrácie a až potom spusti nový build. Node proces je vhodné spravovať cez systemd, správcu procesov alebo kontajner a pred aplikáciu umiestniť reverzný proxy server s HTTPS.
