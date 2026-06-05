# OBJECT_SCOPE_TODO: App-Layer / Database RPC Object-Level Security Gaps

This document identifies all database RPC functions that bypass the object-level security filters (house/apartment restrictions). Because these RPC functions aggregate and return data on an organization-wide level without internal house-scoping, they present an authorization gap when accessed by restricted `mitarbeiter` (employees).

Addressing these gaps requires database-level modifications (Stage 2.2b) to inject `public.get_accessible_haeuser_ids()` inside their SQL query definitions.

---

## In-Scope Database RPC Functions to Refactor

The following RPC functions are invoked in the application code but are currently not scoped at the database level:

### 1. Nebenkosten & Betriebskosten Actions (`app/betriebskosten-actions.ts`)
- **`public.get_nebenkosten_with_metrics()`**: Retrieves years/data of nebenkosten with metrics. Needs database-level filtering using `get_accessible_haeuser_ids()`.
- **`public.get_meter_modal_data()`**: Gathers water/heating meters for modal display. Needs database-level filtering.
- **`public.get_abrechnung_modal_data()`**: Compiles all documents and data for compiling the annual billing. Needs to filter elements to only those linked to accessible houses.
- **`public.get_abrechnung_calculation_data()`**: Computes complex billing values. Calculation engine must filter houses/apartments internally.
- **`public.get_actual_prepayments()`**: Resolves actual prepayment entries from tenants. Should only query from apartments (Wohnungen) where `haus_id` is in the accessible list.

### 2. Zähler & Readings Actions (`app/meter-actions.ts`)
- **`public.get_zaehler_for_haus()`**: Fetches meters for a given house. Must verify if the house ID is in `get_accessible_haeuser_ids()`.
- **`public.get_zaehler_data()`**: Fetches details for a single meter. Must verify that the meter's associated apartment/house is accessible.
- **`public.get_ablesungen_for_zaehler()`**: Resolves historical readings. Must scope access.

### 3. Finance Charts & Analytics Routes (`app/api/finanzen/`)
- **`public.get_financial_chart_data()`**: Aggregates income/expenses over time. Needs database-level scoping on associated apartments.
- **`public.get_financial_summary_data()`**: Resolves aggregate income/expenses. Needs database-level scoping.
- **`public.get_financial_year_summary()`**: Resolves year-based statistics. Needs database-level scoping.
- **`public.get_available_finance_years()`**: Lists years with financial transactions. Needs database-level scoping.

### 4. Tenant Overview & Dashboard Routes (`app/api/tenants-data/` & `lib/data-fetching.ts`)
- **`public.fetch_tenant_payment_dashboard_data()`**: Merges tenant and payment dashboard info. Needs database-level scoping.
- **`public.get_dashboard_summary()`**: Computes dashboard cards (houses, apartments, tenant counts, income). Must filter counts based on accessible objects.
- **`public.get_nebenkosten_chart_data()`**: Aggregates costs for chart display. Needs database-level scoping.

---

## Action Plan for Stage 2.2b
For each function listed above, the SQL function definition (`CREATE OR REPLACE FUNCTION`) must be updated to include queries that check:
```sql
AND (
  public.get_accessible_haeuser_ids() IS NULL 
  OR haus_id = ANY(public.get_accessible_haeuser_ids())
)
```
or equivalent logic matching the table associations (e.g. joining on `Wohnungen` to check `haus_id`).

---

## Performance / später
- Middleware: check_permission-RPC pro Request → später via JWT-Custom-Claims (Supabase Auth Hook) cachen, um DB-Roundtrip im Edge-Pfad zu vermeiden.
