# Datenbankstruktur

Die Datenbank besteht aus folgenden Tabellen:

## profiles

```sql
create table public."profiles" (
  id uuid not null,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_subscription_status text default 'inactive'::text,
  stripe_price_id text,
  stripe_current_period_end timestamp with time zone,
  stripe_cancel_at_period_end boolean default false,
  constraint profiles_pkey primary key (id),
  constraint profiles_id_fkey foreign key (id) references auth.users(id)
) tablespace pg_default;
```

## Aufgaben

```sql
create table public."Aufgaben" (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null default auth.uid (),
  ist_erledigt boolean not null,
  name text not null,
  beschreibung text not null,
  erstellungsdatum timestamp with time zone not null default now(),
  aenderungsdatum timestamp with time zone not null default now(),
  constraint Aufgaben_pkey primary key (id)
) TABLESPACE pg_default;
```

## Finanzen

```sql
create table public."Finanzen" (
  id uuid not null default gen_random_uuid (),
  wohnung_id uuid null,
  name text not null,
  datum date null,
  betrag numeric not null,
  ist_einnahmen boolean not null default false,
  notiz text null,
  user_id uuid not null default auth.uid (),
  constraint Finanzen_pkey primary key (id),
  constraint Finanzen_wohnung_id_fkey foreign KEY (wohnung_id) references "Wohnungen" (id) on update CASCADE on delete CASCADE
) TABLESPACE pg_default;
```

## Häuser

```sql
create table public."Haeuser" (
  id uuid not null default gen_random_uuid (),
  ort text null,
  name text not null,
  user_id uuid not null default auth.uid (),
  strasse text null,
  groesse NUMERIC NULL,
  constraint Haeuser_pkey primary key (id),
  constraint Haeuser_name_key unique (name)
) TABLESPACE pg_default;
```

## Mieter

```sql
create table public."Mieter" (
  id uuid not null default gen_random_uuid (),
  wohnung_id uuid null,
  name text not null,
  einzug date null,
  auszug date null,
  email text null,
  telefonnummer text null,
  notiz text null,
  user_id uuid not null default auth.uid (),
  nebenkosten jsonb null,
  constraint Mieter_pkey primary key (id),
  constraint Mieter_wohnung_id_fkey foreign key (wohnung_id) references "Wohnungen" (id)
) tablespace pg_default;
```

## Nebenkosten

```sql
create table public."Nebenkosten" (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null default auth.uid (),
  startdatum date not null,
  enddatum date not null,
  nebenkostenart text[] null,
  betrag numeric[] null,
  berechnungsart text[] null,
  wasserkosten numeric null,
  haeuser_id uuid not null,
  wasserverbrauch numeric null,
  constraint Nebenkosten_pkey primary key (id),
  constraint Nebenkosten_haeuser_id_fkey foreign key (haeuser_id) references "Haeuser" (id),
  constraint check_date_range check (enddatum > startdatum)
) tablespace pg_default;

-- Add index for date range queries
create index idx_nebenkosten_date_range on "Nebenkosten" (startdatum, enddatum);
```

## Rechnungen

```sql
create table public."Rechnungen" (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null default auth.uid (),
  nebenkosten_id uuid null,
  mieter_id uuid null,
  name text not null,
  betrag numeric null,
  constraint Rechnungen_pkey primary key (id),
  constraint Rechnungen_mieter_id_fkey foreign KEY (mieter_id) references "Mieter" (id) on update CASCADE on delete CASCADE,
  constraint Rechnungen_nebenkosten_id_fkey foreign KEY (nebenkosten_id) references "Nebenkosten" (id) on update CASCADE on delete CASCADE
) TABLESPACE pg_default;
```

## Wasser_Zaehler (Water Meters)

```sql
create table public."Wasser_Zaehler" (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null default auth.uid (),
  wohnung_id uuid not null,
  custom_id text null,
  erstellungsdatum timestamp with time zone not null default now(),
  eichungsdatum date null,
  constraint Wasser_Zaehler_pkey primary key (id),
  constraint Wasser_Zaehler_wohnung_id_fkey foreign key (wohnung_id) references "Wohnungen" (id) on update CASCADE on delete CASCADE
) tablespace pg_default;
```

## Wasser_Ablesungen (Water Readings)

```sql
create table public."Wasser_Ablesungen" (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null default auth.uid (),
  wasser_zaehler_id uuid not null,
  ablese_datum date not null,
  zaehlerstand numeric null,
  verbrauch numeric null,
  constraint Wasser_Ablesungen_pkey primary key (id),
  constraint Wasser_Ablesungen_wasser_zaehler_id_fkey foreign key (wasser_zaehler_id) references "Wasser_Zaehler" (id) on update CASCADE on delete CASCADE
) tablespace pg_default;
```

## Wohnungen

```sql
create table public."Wohnungen" (
  id uuid not null default gen_random_uuid (),
  groesse numeric not null,
  name text not null,
  miete numeric not null,
  user_id uuid not null default auth.uid (),
  haus_id uuid null,
  constraint Wohnungen_pkey primary key (id),
  constraint Wohnungen_name_key unique (name),
  constraint Wohnungen_haus_id_fkey foreign KEY (haus_id) references "Haeuser" (id) on update CASCADE on delete set null
) TABLESPACE pg_default;
```