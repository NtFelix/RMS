/**
 * Minimal layout for the (public) route group.
 *
 * Pages in this group are accessible without authentication.
 * They intentionally do NOT include the dashboard shell/sidebar.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
