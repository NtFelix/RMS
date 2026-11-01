/**
 * Text shown wherever a tenant would stand (at an apartment, in an overview, in the search) for a user without
 * `mieter:ansehen`. Not an error and not an empty value: an empty value would look like "no tenant".
 * The status frei / vermietet stays visible; only name and dates of the tenant are withheld (server-side, see the
 * routes that set `tenantAccess: false`).
 */
export const TENANT_NO_ACCESS_LABEL = 'Kein Zugriff';

/**
 * Notice for the case that the `mieter:ansehen` check itself failed (twice, see lib/tenant-view-access.ts): tenant data
 * is hidden as for a missing right, but the right might actually be there. Shown only together with the server's
 * `permissionCheckFailed` signal, never for a plain "Kein Zugriff".
 */
export const TENANT_CHECK_FAILED_MESSAGE =
  'Rechte konnten nicht geprüft werden, Mieterdaten werden möglicherweise fälschlich ausgeblendet.';
