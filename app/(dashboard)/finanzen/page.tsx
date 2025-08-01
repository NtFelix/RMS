export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import FinanzenClientWrapper from "./client-wrapper";

export default async function FinanzenPage() {
  // The data fetching is now handled by the client component
  // to allow for dynamic filtering, searching, and pagination.
  return <FinanzenClientWrapper />;
}
