# Docker Compose nasadenie

Image sa zostaví priamo zo zdrojových súborov v tomto repozitári. SQLite databáza sa uloží do pomenovaného Docker volume a migrácie sa automaticky aplikujú pri štarte aplikácie.

## Konfigurácia

Vytvor lokálny `.env.docker` zo vzoru:

```bash
cp .env.docker.example .env.docker
```

Pred produkčným spustením povinne nastav `APP_URL`, `SMTP_HOST` a `EMAIL_FROM`. Ak SMTP server vyžaduje prihlásenie, nastav aj `SMTP_USER` a `SMTP_PASSWORD`.

```dotenv
APP_BIND_ADDRESS=127.0.0.1
APP_PORT=3000
APP_URL=https://vino.example.com
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=uzivatel
SMTP_PASSWORD=heslo
EMAIL_FROM="Vinársky Pomocník <noreply@example.com>"
```

Compose neprenesie lokálnu hodnotu `DATABASE_URL`; databázu vždy uloží do `/app/data/database.sqlite` v pomenovanom volume.

## HTTPS a reverzný proxy

Produkčná session cookie je označená ako `Secure`, preto musí byť aplikácia používateľom dostupná cez HTTPS. Port aplikácie je predvolene naviazaný iba na `127.0.0.1`; pred neho umiestni reverzný proxy, napríklad Caddy alebo Nginx, ktorý ukončí TLS a požiadavky presmeruje na `http://127.0.0.1:3000`.

Nezverejňuj port aplikácie priamo do internetu cez nezašifrované HTTP. Ak reverzný proxy beží na inom hostiteľovi, uprav `APP_BIND_ADDRESS` a prístup obmedz firewallom.

## Spustenie

Skript validuje konfiguráciu bez vypísania citlivých hodnôt, zostaví image z aktuálneho Node 22 base image a počká na úspešný healthcheck:

```bash
bash scripts/docker_compose_up.sh
```

Stav a logy aplikácie:

```bash
docker compose --env-file .env.docker -f compose.yaml ps
docker compose --env-file .env.docker -f compose.yaml logs -f app
```

Po spustení musí byť služba označená ako `healthy`. Následne skontroluj verejnú HTTPS adresu aplikácie a dokonči skúšobnú registráciu vrátane doručenia overovacieho e-mailu.

## Aktualizácia

```bash
bash scripts/git_pull.sh
bash scripts/docker_compose_up.sh
```

Dáta ostávajú vo volume `app-data` aj po opätovnom vytvorení kontajnera. `docker compose down` databázu zachová. Príkaz `docker compose down -v` odstráni aj volume a nenávratne vymaže databázu.

## Záloha databázy

SQLite používa WAL režim, preto zálohuj celý dátový adresár, nie iba súbor `database.sqlite`. Pre konzistentnú zálohu najskôr zastav aplikáciu:

```bash
mkdir -p database-backup
docker compose --env-file .env.docker -f compose.yaml stop app
docker compose --env-file .env.docker -f compose.yaml cp app:/app/data/. ./database-backup/
docker compose --env-file .env.docker -f compose.yaml start app
```

Po zálohe over, že adresár obsahuje databázu, a pravidelne testuj aj jej obnovu na samostatnom prostredí.
