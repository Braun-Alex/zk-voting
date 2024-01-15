#!/bin/bash
set -e

host="$1"
shift
port="$1"
shift
cmd="$@"

export PGPASSWORD="${POSTGRES_PASSWORD}"

until psql -h "$host" -U "${POSTGRES_USER}" -p "$port" -d "${POSTGRES_DB}" -c '\q'; do
  sleep 1
done

exec $cmd
