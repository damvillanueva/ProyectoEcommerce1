#!/usr/bin/env bash
set -Eeuo pipefail

psql --set=ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --set=auth_password="$SMARTLOGIX_DB_AUTH_PASSWORD" \
  --set=inventory_password="$SMARTLOGIX_DB_INVENTORY_PASSWORD" \
  --set=order_password="$SMARTLOGIX_DB_ORDER_PASSWORD" \
  --set=shipment_password="$SMARTLOGIX_DB_SHIPMENT_PASSWORD" <<-'EOSQL'
CREATE ROLE smartlogix_auth LOGIN PASSWORD :'auth_password';
CREATE ROLE smartlogix_inventory LOGIN PASSWORD :'inventory_password';
CREATE ROLE smartlogix_order LOGIN PASSWORD :'order_password';
CREATE ROLE smartlogix_shipment LOGIN PASSWORD :'shipment_password';

CREATE DATABASE smartlogix_auth OWNER smartlogix_auth;
CREATE DATABASE smartlogix_inventory OWNER smartlogix_inventory;
CREATE DATABASE smartlogix_order OWNER smartlogix_order;
CREATE DATABASE smartlogix_shipment OWNER smartlogix_shipment;
EOSQL
