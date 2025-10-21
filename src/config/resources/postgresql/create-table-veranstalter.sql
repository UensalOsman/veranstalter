-- Copyright (C) 2025
-- Hochschule Karlsruhe - Beispiel für Veranstalter-Schema
-- Lizenz: GPLv3 oder neuer (siehe https://www.gnu.org/licenses/)

-- Aufruf:
-- docker compose exec db bash
-- psql --dbname=veranstaltung --username=veranstaltung --file=/sql/create-table.sql

SET default_tablespace = veranstalterspace;

CREATE SCHEMA IF NOT EXISTS AUTHORIZATION veranstalter;

ALTER ROLE veranstalter SET search_path = 'veranstalter';
SET search_path TO 'veranstalter';

-- ############################################################
-- ENUMs
-- ############################################################
CREATE TYPE veranstalterart AS ENUM ('ONLINE', 'PRÄSENZ', 'HYBRID');

-- ############################################################
-- Tabelle: veranstalter
-- ############################################################
CREATE TABLE IF NOT EXISTS veranstalter (
    id              integer GENERATED ALWAYS AS IDENTITY(START WITH 1000) PRIMARY KEY,
    version         integer NOT NULL DEFAULT 0,
    name            text NOT NULL,
    email           text UNIQUE NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    telefon         text,
    art             veranstalterart,
    aktiv           boolean NOT NULL DEFAULT TRUE,
    erzeugt     timestamp NOT NULL DEFAULT NOW(),
    aktualisiert timestamp NOT NULL DEFAULT NOW()
);

-- ############################################################
-- Tabelle: teilnehmer (1:n zu veranstalter)
-- ############################################################
CREATE TABLE IF NOT EXISTS teilnehmer (
    id              integer GENERATED ALWAYS AS IDENTITY(START WITH 1000) PRIMARY KEY,
    vorname         text NOT NULL,
    nachname        text NOT NULL,
    email           text UNIQUE NOT NULL,
    registriert  timestamp NOT NULL DEFAULT NOW(),
    veranstalter_id integer NOT NULL REFERENCES veranstalter ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS teilnehmer_veranstalter_id_idx ON teilnehmer(veranstalter_id);

-- ############################################################
-- Tabelle: standort (1:1 zu veranstalter)
-- ############################################################
CREATE TABLE IF NOT EXISTS standort (
    id              integer GENERATED ALWAYS AS IDENTITY(START WITH 1000) PRIMARY KEY,
    strasse         text NOT NULL,
    plz             text NOT NULL,
    ort             text NOT NULL,
    land            text NOT NULL DEFAULT 'Deutschland',
    veranstalter_id integer NOT NULL UNIQUE REFERENCES veranstalter ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS standort_veranstalter_id_idx ON standort(veranstalter_id);
