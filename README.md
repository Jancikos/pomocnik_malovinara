# Vinársky Pomocník

Mobilne orientovaná full-stack aplikácia na evidenciu vín, vstupných surovín, výrobných šarží, ich nádob, meraní, zásahov a presunov v malej pivnici.

## Technológie a architektúra

Projekt používa Nuxt 4 a Vue 3 pre používateľské rozhranie, Nitro pre serverové API, SQLite ako databázu a Drizzle ORM pre databázovú schému a migrácie. Kód je písaný v TypeScripte.

Typický tok požiadavky:

```text
Nuxt stránka → composable → Nitro API → service → repository → Drizzle → SQLite
```

Serverová SQLite databáza je jediný zdroj dát. Prihlásenie e-mailom a heslom používa serverovú session uloženú v HTTP-only cookie. Nové registrácie sa aktivujú jednorazovým odkazom zaslaným e-mailom. Dáta každej požiadavky sú na serveri obmedzené podľa členstva používateľa v pivnici.

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

Lokálne nastavenia sú v súbore `.env`; vzor poskytuje `.env.example`. Premenná `DATABASE_URL` určuje umiestnenie SQLite databázy. SMTP premenné zabezpečujú odosielanie registračných e-mailov. Ak SMTP vo vývoji nie je nastavené, overovací odkaz sa vypíše do terminálu a zobrazí priamo po registrácii; v produkcii je SMTP povinné.

Vývojová hodnota:

```dotenv
DATABASE_URL=./data/dev.sqlite
APP_URL=http://localhost:3000
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=uzivatel
SMTP_PASSWORD=heslo
EMAIL_FROM="Vinársky Pomocník <noreply@example.com>"
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
- `DELETE /api/sarze/:id` vyžaduje potvrdenie `FORCE DELETE` a povolí vymazať iba šaržu bez následníkov. V jednej transakcii odstráni aj jej merania, zásahy a väzby na presuny. Rodokmeň možno postupne vymazať od listov ku koreňu; rodičovská šarža sa znovu neotvára a ostatné vetvy ostávajú zachované.

- `DELETE /api/vina/:id` vyžaduje potvrdenie `FORCE DELETE`. V jednej transakcii odstráni víno, vstupné suroviny a všetky jeho aktívne aj uzavreté šarže vrátane meraní, zásahov a väzieb na presuny. Ak má niektorá šarža následníka preradeného k inému vínu, treba najprv vymazať tohto následníka. Ostatné vína ostávajú zachované.

Testy pokrývajú generovanie ID, snapshot nádoby v šarži, ochranu aktívneho názvu nádoby, append-only merania, latest-per-type, uzavretie, odkalenie, single aj multi-ciel stáčanie, objemovú bilanciu, kapacitu, lineage a ochranu force delete vrátane kaskádového mazania vína a obnovy dát pri chybe.

## Hlavné API

- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET /api/pivnica/prehlad`
- `GET|POST /api/vina`, `GET|DELETE /api/vina/:id`
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
- `APP_URL` na verejnú HTTPS adresu aplikácie
- `SMTP_HOST`, `SMTP_PORT`, prípadne `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_SECURE` a `EMAIL_FROM` na odosielanie potvrdení registrácie
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

## Zdieľanie pivníc

V nastaveniach pivnice môže vlastník poslať emailovú pozvánku s oprávnením **Iba na čítanie** alebo **Všetky úpravy**. Pozvánka je jednorazová, platí presne 24 hodín od vytvorenia a prijme ju len prihlásený používateľ s overeným emailom z pozvánky. Registrácia nového používateľa prebieha štandardne; po prihlásení v rovnakom prehliadači sa vráti k pozvánke. Nová pozvánka pre rovnaký email a pivnicu zneplatní predchádzajúcu.

Vlastník môže meniť oprávnenia, odoberať prístup a rušiť pozvánky. Používateľ s právom úprav môže upravovať údaje a nastavenia pivnice; správu zdieľania má výhradne vlastník. Režim iba na čítanie kontroluje server pri všetkých zápisoch do pivnice. Osobné nastavenia účtu zostávajú dostupné.

Prepínač aktívnej pivnice je v ľavom paneli a na mobile v hlavičke. Výber sa ukladá do prihlásenej session. Prepnutie načíta nový prehľad; formuláre v staršom okne odmietnu uloženie, ak sa aktívna pivnica zmenila.

Názov, predvolené umiestnenie nádob a logo patria do **Nastavení pivnice**. Logo môže byť PNG, JPEG alebo WebP do 10 MB; ukladá sa do databázy. Migrácia `0006` zachová existujúce členstvá a prevezme predvolené umiestnenie od vlastníka. Členstvo `MEMBER` naďalej znamená právo úprav.

Pozvánky používajú rovnaké SMTP nastavenia ako registrácia. V produkcii nastavte `APP_URL` na verejnú HTTPS adresu. Bez SMTP sa vo vývoji zobrazí odkaz priamo v nastaveniach; email sa vtedy neodosiela. Pri zlyhaní odoslania sa nová pozvánka zruší. Pred nasadením aplikujte databázové migrácie.

## Verziovanie aplikácie

Verzia má formát `MAJOR.MINOR.PATCH` a jej jediným zdrojom je pole `version` v `package.json`. Aktuálna verzia sa pri zostavení vloží do aplikácie a nenápadne sa zobrazuje pod obsahom prihlásených stránok na počítači aj mobile.

Pred vydaním zvýš verziu podľa rozsahu zmien:

```powershell
npm version patch --no-git-tag-version # oprava chyby, napr. 1.0.0 → 1.0.1
npm version minor --no-git-tag-version # nová funkcia, napr. 1.0.0 → 1.1.0
npm version major --no-git-tag-version # nekompatibilná zmena, napr. 1.0.0 → 2.0.0
```

Spusti iba jeden z týchto príkazov. Aktualizuje `package.json` aj `package-lock.json` bez vytvorenia commitu či Git tagu. Potom aplikáciu znovu zostav (`npm run build`) a nasaď; vo vývoji reštartuj vývojový server.
