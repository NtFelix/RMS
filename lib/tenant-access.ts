/**
 * Text shown wherever a tenant would stand (at an apartment, in an overview, in the search) for a user without
 * `mieter:ansehen`. Not an error and not an empty value: an empty value would look like "no tenant".
 * The status frei / vermietet stays visible; only name and dates of the tenant are withheld (server-side, see the
 * routes that set `tenantAccess: false`).
 */
export const TENANT_NO_ACCESS_LABEL = 'Kein Zugriff';
