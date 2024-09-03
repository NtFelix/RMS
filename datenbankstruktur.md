### Datenbankstruktur

**Tabelle: Mieter**

wohnung-id (uuid) (Verbindung zu “Wohnungen”)

name (text)

einzug (date)

auszug (date)

email (text)

telefonnummer (text)

notiz (text)

nebenkosten (numeric)

---

**Tabelle: Wohnungen**

id (uuid)

Wohnung (text)

Größe (numeric)

Miete (numeric)

---

**Tabelle: betriebskosten**

id (uuid)

year (int4)

nebenkostenarten (text[])

betrag (numeric[])

berechnungsarten (text[])

gesamtflaeche (numeric)

wasserzaehler-gesamtkosten (numeric)

---

**Tabelle: transaktionen**

wohnung-id (uuid) (Verbindung zu “Wohnungen”)

id (uuid)

name (text)

betrag (numeric)

ist_einnahmen (bool)

transaction-date (date)

notizen (text)

---

**Tabelle: Wasserzähler**

mieter-name (text) (Verbindung zu “Mieter”)

year (int4) (Verbindung zu “betriebskosten”)

id (uuid)

ablesung-datum (date)

zählerstand (numeric)

verbrauch (numeric)

---