# Stripe Metadata Configuration for Pricing Table

To populate the feature comparison table on the pricing page dynamically, you need to add the following **Metadata** key-value pairs to your **Products** in the Stripe Dashboard.

## How to add Metadata in Stripe

1.  Go to your [Stripe Dashboard > Product Catalog](https://dashboard.stripe.com/products).
2.  Click on a Product (e.g., "Starter", "Professional", "Enterprise").
3.  Click "Edit" or scroll down to the "Metadata" section.
4.  Click "Add metadata".
5.  Enter the **Key** and **Value** as described below.
6.  Save the product.

Repeat this for all your products.

## Metadata Keys

### General Features (Allgemeine Funktionen)

| Feature Name | Metadata Key | Example Value (Starter) | Example Value (Pro) | Example Value (Enterprise) |
| :--- | :--- | :--- | :--- | :--- |
| **Anzahl Einheiten** | `feat_units` | `Bis zu 5` | `Bis zu 50` | `Unbegrenzt` |
| **Benutzerzugänge** | `feat_users` | `1` | `3` | `Unbegrenzt` |
| **Dokumentenspeicher** | `feat_storage` | `1 GB` | `10 GB` | `1 TB` |
| **Mobile App** | `feat_mobile_app` | `true` | `true` | `true` |

### Management & Organization (Verwaltung & Organisation)

| Feature Name | Metadata Key | Value Type |
| :--- | :--- | :--- |
| **Digitale Mieterakte** | `feat_tenant_files` | `true` / `false` |
| **Vertragsmanagement** | `feat_contracts` | `true` / `false` |
| **Aufgabenmanagement** | `feat_tasks` | `true` / `false` |
| **Wartungsplaner** | `feat_maintenance` | `true` / `false` |

### Finance & Accounting (Finanzen & Buchhaltung)

| Feature Name | Metadata Key | Value Type |
| :--- | :--- | :--- |
| **Mieteingangskontrolle** | `feat_rent_check` | `true` / `false` |
| **Nebenkostenabrechnung** | `feat_utility_costs` | `Basis`, `Erweitert`, `Premium` |
| **Automatische Mahnungen** | `feat_dunning` | `true` / `false` |
| **DATEV Export** | `feat_datev` | `true` / `false` |
| **Bankintegration** | `feat_banking` | `true` / `false` |

### Support & Service

| Feature Name | Metadata Key | Example Values |
| :--- | :--- | :--- |
| **Support-Level** | `feat_support` | `Email`, `Email & Chat`, `24/7 Priority` |
| **Onboarding-Hilfe** | `feat_onboarding` | `true` / `false` |
| **Dedizierter Ansprechpartner** | `feat_account_manager` | `true` / `false` |

## Notes

*   **Boolean Values**: For features that are either included or not (checked/unchecked), use `true` or `false` as string values.
*   **Text Values**: For features with specific limits or descriptions, enter the text exactly as you want it to appear (e.g., "10 GB").
*   **Missing Keys**: If a key is missing for a product, it will appear as a "minus" (not included) in the table.
