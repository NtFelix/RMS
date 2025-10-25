
// "use client" directive removed - this is now a Server Component file.

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

import MailsClientView from "./client-wrapper"; // Import the default export

export default async function MailsPage() {
  // For now, we will use dummy data.
  const mails = [
    { id: '1', date: '2024-07-26', subject: 'Willkommen!', recipient: 'test@example.com', status: 'sent', type: 'outbox', hasAttachment: false, source: 'Mietfluss', read: true, favorite: false },
    { id: '2', date: '2024-07-25', subject: 'Ihre Rechnung', recipient: 'another@example.com', status: 'draft', type: 'outbox', hasAttachment: true, source: 'Mietfluss', read: false, favorite: true },
    { id: '3', date: '2024-07-24', subject: 'Welcome Email', recipient: 'user@gmail.com', status: 'sent', type: 'inbox', hasAttachment: false, source: 'Gmail', read: true, favorite: false },
    { id: '4', date: '2024-07-23', subject: 'Archived Mail', recipient: 'archive@example.com', status: 'archiv', type: 'inbox', hasAttachment: false, source: 'Mietfluss', read: true, favorite: false },
    { id: '5', date: '2024-07-22', subject: 'New Feature', recipient: 'dev@example.com', status: 'sent', type: 'outbox', hasAttachment: true, source: 'Mietfluss', read: true, favorite: true },
    { id: '6', date: '2024-07-21', subject: 'Support Request', recipient: 'support@example.com', status: 'sent', type: 'inbox', hasAttachment: true, source: 'Outlook', read: false, favorite: false },
    { id: '7', date: '2024-07-20', subject: 'Password Reset', recipient: 'user@example.com', status: 'sent', type: 'inbox', hasAttachment: false, source: 'Mietfluss', read: true, favorite: false },
    { id: '8', date: '2024-07-19', subject: 'Re: Meeting', recipient: 'team@example.com', status: 'draft', type: 'outbox', hasAttachment: false, source: 'Mietfluss', read: false, favorite: false },
    { id: '9', date: '2024-07-18', subject: 'Your monthly summary', recipient: 'user@example.com', status: 'sent', type: 'inbox', hasAttachment: true, source: 'Mietfluss', read: false, favorite: false },
    { id: '10', date: '2024-07-17', subject: '[Update] New version available', recipient: 'user@example.com', status: 'sent', type: 'inbox', hasAttachment: false, source: 'Mietfluss', read: true, favorite: false },
    { id: '11', date: '2024-07-16', subject: 'Security Alert', recipient: 'user@example.com', status: 'sent', type: 'inbox', hasAttachment: false, source: 'Mietfluss', read: false, favorite: true },
  ];

  return (
    <MailsClientView
      initialMails={mails}
    />
  );
}
