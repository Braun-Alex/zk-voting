#!/bin/bash
set -e

if [ -f .env ]; then
    export $(cat .env | xargs)
fi

execute_sql() {
    psql -v ON_ERROR_STOP=1 --username "${POSTGRES_USER}" --dbname "${POSTGRES_DB}" -c "$1"
}

DB_EXIST=$(psql -U "${POSTGRES_USER}" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${POSTGRES_DB}'")
if [ "$DB_EXIST" != "1" ]; then
    execute_sql "CREATE DATABASE \"${POSTGRES_DB}\""
fi

ROLE_EXIST=$(psql -U "${POSTGRES_USER}" -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='${POSTGRES_USER}'")
if [ "$ROLE_EXIST" != "1" ]; then
    execute_sql "CREATE ROLE \"${POSTGRES_USER}\" WITH LOGIN PASSWORD '${POSTGRES_PASSWORD}'"
fi

psql -v ON_ERROR_STOP=1 -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" <<-EOSQL
    CREATE TABLE IF NOT EXISTS accounts (
        nickname VARCHAR PRIMARY KEY NOT NULL,
        private_key VARCHAR NOT NULL,
        password VARCHAR NOT NULL,
        salt VARCHAR NOT NULL,
        polls VARCHAR[] NOT NULL
    );
EOSQL

psql -v ON_ERROR_STOP=1 -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -c "ALTER TABLE accounts OWNER TO \"${POSTGRES_USER}\""
