/**
 * Minimal layout for the (public) route group.
 *
 * Pages in this group are accessible without authentication.
 * They intentionally do NOT include the dashboard shell/sidebar.
 */
// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default function PublicLayout(
  {
    children,
  }: {
    children: React.ReactNode;
  }
) {
  return <>{children}</>;
}
