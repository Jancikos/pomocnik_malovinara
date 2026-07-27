# Vinársky Pomocník

Mobile-first PWA prototyp pre malovinára. Eviduje vína, vstupný materiál, šarže s vloženým snapshotom nádoby, merania, zásahy, históriu a auditnú stopu. Po prvom online prihlásení funguje vybraný obsah aj bez pripojenia.

## Spustenie

Požaduje Node.js 22.18+ alebo 24.12+.

```sh
npm install
npm run dev
```

Produkčné a kontrolné príkazy:

```sh
npm run build
npm run lint
npm run test:unit -- --run
npm run test:e2e
```

Demo účet:

- e-mail: `oskar@example.sk`
- heslo: `vino2026`

Prihlásenie je iba lokálna simulácia, nie produkčný bezpečnostný mechanizmus. Heslo sa do relácie ani databázy neukladá.

## Architektúra

Rozhranie je postavené na Vue 3, Composition API, Pinia, Vue Router a Tailwind CSS. Dáta prechádzajú z obrazoviek cez aplikačný store do repository vrstvy a Dexie/IndexedDB. `WineryRepository` je hranica, ktorú možno neskôr nahradiť HTTP implementáciou bez zmeny prezentačných komponentov.

Lokálna databáza má verziované migrácie. Seed sa importuje iba raz podľa `seedVersion` a ďalšie spustenia neprepisujú používateľské zmeny. Viacentitné operácie (víno + prvá šarža, presun, rozdelenie a spojenie) sa zapisujú v jednej IndexedDB transakcii spolu s auditom a jednou položkou synchronizačného radu.

Nádoba nie je entita: nemá tabuľku, repository, samostatný seed ani CRUD. Je uložená ako `BatchContainer` priamo v každej šarži a po uzavretí zostáva historickým snapshotom.

## Seed dáta

`src/data/seed/` obsahuje nemenné ukážkové súbory:

- `users.json`, `cellars.json` – demo identita a pivnica,
- `wines.json`, `materials.json` – rodičovské vína a zber,
- `batches.json` – osem aktívnych a historické šarže s vloženými nádobami,
- `batch-relations.json` – ukážka presunu a rozdelenia,
- `measurements.json`, `interventions.json` – časová os,
- `audit-entries.json` – počiatočný audit.

Súbor `containers.json` zámerne neexistuje.

Demo dáta možno obnoviť vymazaním IndexedDB `vinarsky-pomocnik` a lokálnych kľúčov s prefixom `vinarsky-`, prípadne cez metódu `resetDemo()` aplikačného store.

## Číselníky

Všetky dynamické katalógy sú v `src/data/config/`, majú stabilný `catalog`, verziu a položky s `code`, slovenským `label`, `enabled` a `sortOrder`. Položka môže navyše definovať farbu, ikonu, vizuál, jednotku, validačný rozsah, formulárové polia a doménový `behavior`.

Novú položku pridajte do príslušného JSON súboru s jedinečným kódom a poradím. Vue komponent netreba meniť. Deaktivovaná položka sa nezobrazí pri novom zázname, ale `CatalogService.get()` ju naďalej rozpozná v histórii.

| Číselník | Stratégia | Dôvod |
|---|---|---|
| Typ suroviny, typ materiálu, farba vína | TypeScript enum | Malé stabilné dátové kontrakty |
| Produkčný a životný stav šarže | TypeScript enum | Systémové invarianty a obchodná logika |
| Dôvod uzavretia a typ väzby | TypeScript enum/literal union | Priama väzba na operácie |
| Technické sync stavy | TypeScript literal union | Interný protokol, nie používateľská konfigurácia |
| Typ nádoby | Catalog Service + JSON | Názov, poradie, ikona a vizuál |
| Fáza a vizuálny stav šarže | Catalog Service + JSON | UI prezentácia a konfigurovateľné pravidlá |
| Typ merania | Catalog Service + JSON | Jednotka, vstup a demo limity |
| Senzorika a čírosť | Catalog Service + JSON | Poradie, dostupnosť a historické zobrazenie |
| Typ zásahu | Catalog Service + JSON | Dynamické polia a behavior handler |
| Jednotky | Catalog Service + JSON | Zdieľané referencie iných katalógov |

`CatalogOptionProvider` a `EnumOptionProvider` zjednocujú vykreslenie oboch stratégií. Slovenské názvy enumov sú iba v centrálnej `enumLabels` mape. Catalog Service predstavuje runtime prezentáciu; enum predstavuje stabilný kódový kontrakt; technický stav patrí výhradne synchronizačnému protokolu.

## PWA, offline a synchronizácia

PWA manifest, lokálne ikony a service worker generuje `vite-plugin-pwa`. Aktualizácia novej verzie sa ponúkne používateľovi bezpečným potvrdením.

Po prvom online prihlásení sú offline dostupné Pivnica, už uložené detaily a História. Offline možno vytvoriť meranie alebo zásah; manipulačný zásah sa uloží atomicky, ak sú zdrojové šarže lokálne dostupné. Vytvorenie vína alebo prvej šarže vyžaduje pripojenie.

Synchronizačný rad spracúva položky FIFO a používa `idempotencyKey`. Stavy sú `pending`, `syncing`, `synced` a `failed`. Spustí sa po obnovení pripojenia, návrate do aplikácie a tlačidlom „Synchronizovať“. Background Sync je iba progresívne vylepšenie; aplikácia má vlastný fallback.

Simulovanú chybu zapnete:

```js
localStorage.setItem('vinarsky-simulate-error', 'true')
```

Vypnete ju odstránením kľúča. Opakované odoslanie rovnakého idempotency kľúča nevytvorí duplicitný serverový receipt.

## Audit, pravidlá a obmedzenia

Každé vytvorenie, zmena a soft delete sledovaného záznamu vytvorí nemenný `AuditEntry` s pôvodným a novým snapshotom. Offline audit vzniká v rovnakej transakcii ako doménová zmena.

Automatický stav šarže používa `status-rules.json`: minimálnu voľnú síru, vek merania, pomer naplnenia a teplotu podľa fázy. Hodnoty sú výhradne demo, nie odborné, zdravotné ani legislatívne odporúčanie.

Prvá verzia zámerne neobsahuje registráciu, roly, samostatnú evidenciu prázdnych nádob, kalkulačku síry ani cukru, notifikácie, svetlý režim ani pokročilé analytické grafy na obrazovke Merania. Základný register meraní s filtrami je dostupný. Skutočný backend sa pripája implementáciou existujúcej repository hranice a serverového sync transportu.
