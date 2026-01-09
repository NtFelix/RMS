/**
 * Sample Email Seeder Script
 * 
 * This script creates sample emails in the database and storage for testing.
 * Run with: npx ts-node scripts/seed-sample-emails.ts
 */

import { createClient } from '@supabase/supabase-js';
import pako from 'pako';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface SampleEmail {
  betreff: string;
  absender: string;
  empfaenger: string;
  ordner: string;
  quelle: string;
  hat_anhang: boolean;
  ist_gelesen: boolean;
  ist_favorit: boolean;
  htmlContent: string;
  plainContent: string;
}

const sampleEmails: SampleEmail[] = [
  {
    betreff: 'Willkommen bei Mietevo!',
    absender: 'info@mietevo.de',
    empfaenger: 'user@example.com',
    ordner: 'inbox',
    quelle: 'custom',
    hat_anhang: false,
    ist_gelesen: false,
    ist_favorit: false,
    htmlContent: `
      <p>Sehr geehrte Damen und Herren,</p>
      <p>herzlich willkommen bei Mietevo! Wir freuen uns, Sie als neuen Nutzer begrüßen zu dürfen.</p>
      <p>Mit unserer Plattform können Sie:</p>
      <ul>
        <li>Ihre Immobilien effizient verwalten</li>
        <li>Mieter organisieren</li>
        <li>Finanzen im Blick behalten</li>
      </ul>
      <p>Bei Fragen stehen wir Ihnen jederzeit zur Verfügung.</p>
      <p>Mit freundlichen Grüßen<br/>Ihr Mietevo Team</p>
    `,
    plainContent: `Sehr geehrte Damen und Herren,

herzlich willkommen bei Mietevo! Wir freuen uns, Sie als neuen Nutzer begrüßen zu dürfen.

Mit unserer Plattform können Sie:
- Ihre Immobilien effizient verwalten
- Mieter organisieren
- Finanzen im Blick behalten

Bei Fragen stehen wir Ihnen jederzeit zur Verfügung.

Mit freundlichen Grüßen
Ihr Mietevo Team`
  },
  {
    betreff: 'Ihre Rechnung für Januar 2025',
    absender: 'billing@mietevo.de',
    empfaenger: 'user@example.com',
    ordner: 'inbox',
    quelle: 'custom',
    hat_anhang: true,
    ist_gelesen: false,
    ist_favorit: true,
    htmlContent: `
      <p>Sehr geehrte Damen und Herren,</p>
      <p>anbei erhalten Sie Ihre Rechnung für den aktuellen Abrechnungszeitraum.</p>
      <table style="border-collapse: collapse; margin: 20px 0;">
        <tr><td style="padding: 5px;"><strong>Rechnungsnummer:</strong></td><td style="padding: 5px;">2025-01-001</td></tr>
        <tr><td style="padding: 5px;"><strong>Rechnungsdatum:</strong></td><td style="padding: 5px;">26.01.2025</td></tr>
        <tr><td style="padding: 5px;"><strong>Betrag:</strong></td><td style="padding: 5px;">49,99 €</td></tr>
      </table>
      <p>Die Zahlung erfolgt automatisch über Ihre hinterlegte Zahlungsmethode.</p>
      <p>Mit freundlichen Grüßen<br/>Ihr Mietevo Team</p>
    `,
    plainContent: `Sehr geehrte Damen und Herren,

anbei erhalten Sie Ihre Rechnung für den aktuellen Abrechnungszeitraum.

Rechnungsnummer: 2025-01-001
Rechnungsdatum: 26.01.2025
Betrag: 49,99 €

Die Zahlung erfolgt automatisch über Ihre hinterlegte Zahlungsmethode.

Mit freundlichen Grüßen
Ihr Mietevo Team`
  },
  {
    betreff: 'Neue Funktionen verfügbar',
    absender: 'updates@mietevo.de',
    empfaenger: 'user@example.com',
    ordner: 'inbox',
    quelle: 'custom',
    hat_anhang: false,
    ist_gelesen: true,
    ist_favorit: false,
    htmlContent: `
      <h2>Neue Funktionen in Mietevo</h2>
      <p>Wir haben einige spannende neue Funktionen für Sie entwickelt:</p>
      <ol>
        <li><strong>E-Mail-Integration:</strong> Verwalten Sie Ihre E-Mails direkt in Mietevo</li>
        <li><strong>Erweiterte Berichte:</strong> Neue Finanzberichte und Analysen</li>
        <li><strong>Mobile App:</strong> Jetzt auch für iOS und Android verfügbar</li>
      </ol>
      <p>Probieren Sie die neuen Funktionen aus und geben Sie uns Feedback!</p>
      <p>Viele Grüße<br/>Ihr Mietevo Team</p>
    `,
    plainContent: `Neue Funktionen in Mietevo

Wir haben einige spannende neue Funktionen für Sie entwickelt:

1. E-Mail-Integration: Verwalten Sie Ihre E-Mails direkt in Mietevo
2. Erweiterte Berichte: Neue Finanzberichte und Analysen
3. Mobile App: Jetzt auch für iOS und Android verfügbar

Probieren Sie die neuen Funktionen aus und geben Sie uns Feedback!

Viele Grüße
Ihr Mietevo Team`
  }
];

async function seedEmails(userId: string) {
  console.log('Starting email seeding for user:', userId);

  // First, create a mail account if it doesn't exist
  const { data: existingAccount } = await supabase
    .from('Mail_Accounts')
    .select('id')
    .eq('user_id', userId)
    .eq('email_address', 'user@example.com')
    .single();

  let mailAccountId: string;

  if (existingAccount) {
    mailAccountId = existingAccount.id;
    console.log('Using existing mail account:', mailAccountId);
  } else {
    const { data: newAccount, error: accountError } = await supabase
      .from('Mail_Accounts')
      .insert({
        user_id: userId,
        email_address: 'user@example.com',
        provider: 'custom',
        display_name: 'Mietevo Account',
        is_active: true
      })
      .select()
      .single();

    if (accountError) {
      console.error('Error creating mail account:', accountError);
      return;
    }

    mailAccountId = newAccount.id;
    console.log('Created new mail account:', mailAccountId);
  }

  // Seed each email
  for (const email of sampleEmails) {
    try {
      // Create email body object
      const emailBody = {
        html: email.htmlContent,
        plain: email.plainContent,
        metadata: {
          created: new Date().toISOString()
        }
      };

      // Compress email body
      const jsonString = JSON.stringify(emailBody);
      const compressed = pako.gzip(jsonString);

      // Generate unique ID for this email
      const emailId = crypto.randomUUID();
      const storagePath = `${userId}/${emailId}/body.json.gz`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('mails')
        .upload(storagePath, compressed, {
          contentType: 'application/gzip',
          upsert: false
        });

      if (uploadError) {
        console.error('Error uploading email body:', uploadError);
        continue;
      }

      // Insert metadata into database
      const { error: insertError } = await supabase
        .from('Mail_Metadaten')
        .insert({
          id: emailId,
          user_id: userId,
          mail_account_id: mailAccountId,
          quelle: email.quelle,
          betreff: email.betreff,
          absender: email.absender,
          empfaenger: email.empfaenger,
          ordner: email.ordner,
          dateipfad: storagePath,
          hat_anhang: email.hat_anhang,
          ist_gelesen: email.ist_gelesen,
          ist_favorit: email.ist_favorit,
          datum_erhalten: new Date().toISOString()
        });

      if (insertError) {
        console.error('Error inserting email metadata:', insertError);
        continue;
      }

      console.log(`✓ Created email: ${email.betreff}`);
    } catch (error) {
      console.error(`Error processing email "${email.betreff}":`, error);
    }
  }

  console.log('Email seeding completed!');
}

// Get user ID from command line argument
const userId = process.argv[2];

if (!userId) {
  console.error('Usage: npx ts-node scripts/seed-sample-emails.ts <user-id>');
  console.error('Example: npx ts-node scripts/seed-sample-emails.ts 12345678-1234-1234-1234-123456789abc');
  process.exit(1);
}

seedEmails(userId).catch(console.error);
