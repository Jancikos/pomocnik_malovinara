# Implementačný plán: Nuxt full-stack refaktor

## 1. Aktuálna architektúra

Projekt je klientská Vue 3/Vite PWA. Routing zabezpečuje `vue-router`, globálny stav Pinia store a doménové dáta ukladá browser repository cez Dexie do IndexedDB. Store zároveň riadi lokálnu demo session, online/offline stav, synchronizačný rad a simulovaný serverový sync. Nádoba nie je samostatná entita; jej snapshot je vložený v každej šarži. Statické doménové typy, jednotky, formulárové polia a stavové pravidlá sú rozdelené medzi TypeScript typy a JSON katalógy v `src/data/config`.

Existujúce obrazovky pokrývajú pivnicu, vína, detail vína a šarže, merania, históriu a lokálne demo prihlásenie. UI je mobilne orientované, tmavé, s veľkými ovládacími prvkami a vizuálnou mriežkou nádob. Business operácie presunu, rozdelenia a spojenia sú dnes implementované v store/repository a atomické iba v rámci IndexedDB.

## 2. Časti na odstránenie

- Vite bootstrap, ručný Vue Router a PWA konfigurácia.
- Dexie databáza, browser repository, sync queue, receipts, online/offline listenery a simulácia synchronizácie.
- `localStorage` session a všetky browserové persistence mechanizmy.
- Pinia store ako zdroj doménových dát.
- JSON katalógy stabilných doménových enumov, ich generic CatalogService a historické typy meraní, zásahov a fáz.
- Historické operácie merge, bottling a samostatný split workflow; rozdelenie bude súčasťou všeobecného transferu do 1..N nádob.
- Vite/PWA/Dexie/Pinia závislosti, staré testy viazané na IndexedDB a nepoužívané seed/config súbory.

## 3. Časti na zachovanie

- Vizuálny jazyk, dark/earthy paleta, rozloženie hlavného dashboardu a vessel assets.
- Malé prezentačné komponenty (ikony, vizuál nádoby, status badge) po prispôsobení novým DTO.
- Použiteľné formátovacie utility a slovenské popisy.
- Doménové jadro existujúcich validačných pravidiel: parsovanie desatinných čísel, kontrola kapacity, bilancia objemov a výber posledného merania; pravidlá sa presunú do shared/server vrstvy.
- Existujúce demo dáta iba ako vývojový seed po transformácii na nový model. Nejde o produkčné používateľské dáta.

## 4. Cieľová architektúra

Nuxt 4 bude hostiť Vue frontend aj Nitro API. Stránky budú volať malé composables, tie `$fetch`/`useFetch`, API vykoná parse a serverovú validáciu a deleguje na service. Service drží business pravidlá a transakčné workflow, repository iba Drizzle query. SQLite na serveri je jediný zdroj pravdy.

Tok: `page/component -> composable -> Nitro API -> service -> repository -> Drizzle -> SQLite`.

Demo autentifikácia sa zachová bez veľkého auth systému: login vytvorí náhodnú serverovú session uloženú v DB a nastaví HTTP-only cookie. Každý chránený endpoint odvodí používateľa a pivnicu zo session/membership, nie z klientom poslaného `cellarId`.

## 5. Cieľový databázový model

- `users`, `cellars`, `cellar_members`, `sessions`
- `wines` (`cellarId`, stabilný `code`, názov, ročník, farba, poznámka)
- `wine_source_materials` (odroda, podiel, hmotnosť, objem, cukornatosť)
- `vessels` (pivnica, názov, typ, kapacita, lokalita)
- `batches` (generované ID, víno, fáza, nádoba, rodič, objem, stav a časové údaje)
- `measurements` (append-only typ, hodnota, jednotka, čas merania)
- `interventions` (povolený typ, čas, poznámka)
- `transfers` (zdrojová šarža, strata, cieľová fáza, čas)
- `transfer_destinations` (transfer, nádoba, objem, vzniknutá šarža)

Aktívna šarža v nádobe je určená z `batches`; obsadenosť sa neukladá duplicitne. Lineage je zachovaný cez `parentBatchId` aj explicitný transfer destination.

## 6. Migračné kroky

1. Zaviesť Nuxt konfiguráciu, shared enumy/DTO a validačné utility.
2. Pridať Drizzle SQLite schému, SQL migráciu, DB klienta, WAL a idempotentný vývojový seed.
3. Implementovať repositories a služby pre vína, nádoby, šarže, merania, zásahy, dashboard a transfer.
4. Pokryť generovanie ID a všetky viac-krokové operácie SQLite transakciami.
5. Pridať Nitro API a serverovú session/membership kontrolu.
6. Migrovať obrazovky na Nuxt pages a `$fetch` composables, pričom zachovať mobilný vizuál.
7. Odstrániť Vite/Pinia/Dexie/PWA/offline kód a historické katalógy.
8. Doplniť service/domain testy, spustiť migráciu na prázdnej DB, typecheck, lint, testy a Nuxt build.

## 7. Riziká a rozhodnutia

- **Rozhodnutie – staré browser dáta:** Existujúce dáta sú lokálny demo seed v IndexedDB, nie serverové používateľské dáta. Automatický prenos z browsera by odporoval odstráneniu offline architektúry a neexistuje spoľahlivý serverový identifikátor. Budú nahradené transformovaným serverovým demo seedom. Ak sa v konkrétnom browseri nachádzajú reálne dáta, pred nasadením je potrebný jednorazový export mimo tejto migrácie.
- **Rozhodnutie – auth:** Pôvodné prihlásenie je iba lokálna simulácia. Implementuje sa malá DB session s HTTP-only cookie a jedným seed používateľom, nie registrácia/obnova hesla/role management.
- **Rozhodnutie – úplný transfer:** UI a service štandardne vyžadujú, aby `destinations + loss = source volume`; tým nevznikne aktívna šarža s nejasným zvyškom.
- **Riziko – SQLite driver:** `better-sqlite3` je natívny Node modul; deployment musí používať Node/Nitro server a persistentný filesystem, nie edge runtime.
- **Riziko – force delete:** Vymazanie bude povolené iba s explicitnou frázou `FORCE DELETE` a iba bez následníkov/transferov; naviazané merania a zásahy sa nebudú potichu kaskádovo mazať.

## 8. Staré súbory/moduly na odstránenie

- `src/db/database.ts`, `src/repositories/wineryRepository.ts`, `src/stores/*`
- `src/router`, `src/main.ts`, staré `src/views` a formuláre previazané na store
- `src/data/config/*`, staré browser seed importy a offline testy
- `vite.config.ts`, `index.html`, `env.d.ts`, staré Vite TypeScript konfigurácie
- PWA ikony iba vtedy, ak po odstránení manifestu nie sú nikde použité

## 9. Acceptance criteria

- Nuxt 4 frontend a Nitro API sa zostavia produkčným buildom.
- Drizzle používa SQLite z `DATABASE_URL`; DB súbory sú ignorované a mimo `.output`.
- Browser neobsahuje domain persistence, PWA, offline queue ani lokálnu auth session.
- Povolené enumy sú presne štyri merania, tri zásahy a štyri fázy.
- Server autoritatívne validuje scope, objemy, kapacity, prechody, percentá a stav šarže.
- Merania sú append-only a dashboard dostáva latest-per-type zo servera.
- Batch ID vzniká v transakcii v scope pivnica/rok/víno/fáza.
- Close, clarification a transfer 1..N sú konzistentné; lineage a strata sú uložené.
- Force delete je explicitné a chráni graf histórie.
- Kritické doménové operácie majú testy a migration/typecheck/lint/test/build prejdú.
