
// "use client" directive removed - this is now a Server Component file.

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

import MailsClientView from "./client-wrapper"; // Import the default export

export default async function MailsPage() {
  // For now, we will use dummy data.
  const mails = [
    { id: '1', date: '2024-07-26', subject: 'Willkommen!', recipient: 'test@example.com', status: 'sent' },
    { id: '2', date: '2024-07-25', subject: 'Ihre Rechnung', recipient: 'another@example.com', status: 'draft' },
  ];

  return (
    <MailsClientView
      initialMails={mails}
    />
  );
}
