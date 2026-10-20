#!/usr/bin/env bash
# Buat ulang database uji lalu jalankan semua migrasi, seed, dan uji.
# Pakai: PGHOST=localhost PGPORT=5432 PGPASSWORD=... supabase/tests/jalankan.sh
set -euo pipefail
PSQL="psql -h ${PGHOST:-/tmp/pgsock} -p ${PGPORT:-5433} -U ${PGUSER:-postgres} -v ON_ERROR_STOP=1 -q"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
$PSQL -d postgres -c "drop database if exists rentalaja_uji" -c "create database rentalaja_uji"
for f in "$ROOT"/supabase/migrations/*.sql; do echo "migrasi: $(basename "$f")"; $PSQL -d rentalaja_uji -f "$f"; done
echo "seed"; $PSQL -d rentalaja_uji -f "$ROOT/supabase/seed.sql"
for f in "$ROOT"/supabase/tests/*.sql; do echo "uji: $(basename "$f")"; $PSQL -d rentalaja_uji -f "$f"; done
echo "SEMUA LULUS"
