import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface EinladungEmailProps {
  /** Name or email of the person sending the invite */
  einladerName: string;
  /** Name of the organisation */
  organisationsName: string;
  /** Role the invitee will receive */
  rolle: "admin" | "mitarbeiter";
  /** Full URL to the acceptance page (including token) */
  akzeptierenUrl: string;
}

const rolleLabel: Record<EinladungEmailProps["rolle"], string> = {
  admin: "Administrator",
  mitarbeiter: "Mitarbeiter",
};

export default function EinladungEmail({
  einladerName,
  organisationsName,
  rolle,
  akzeptierenUrl,
}: EinladungEmailProps) {
  return (
    <Html lang="de" dir="ltr">
      <Head />
      <Preview>
        Du wurdest von {einladerName} zu {organisationsName} auf Mietevo
        eingeladen.
      </Preview>
      <Body style={body}>
        <Container style={container}>
          {/* Logo / Wordmark */}
          <Section style={logoSection}>
            <Text style={logoText}>mietevo</Text>
          </Section>

          <Section style={card}>
            <Heading style={heading}>Du hast eine Einladung erhalten</Heading>

            <Text style={paragraph}>
              <strong>{einladerName}</strong> hat dich eingeladen, der
              Organisation <strong>{organisationsName}</strong> auf Mietevo als{" "}
              <strong>{rolleLabel[rolle]}</strong> beizutreten.
            </Text>

            <Text style={paragraph}>
              Klicke auf die Schaltfläche unten, um die Einladung anzunehmen.
              Der Link ist <strong>7 Tage</strong> gültig.
            </Text>

            <Section style={buttonSection}>
              <Button style={button} href={akzeptierenUrl}>
                Einladung annehmen
              </Button>
            </Section>

            <Hr style={divider} />

            <Text style={smallPrint}>
              Falls du diese Einladung nicht erwartet hast, kannst du diese
              E-Mail ignorieren. Es wurden keine Daten ohne deine Zustimmung
              gespeichert.
            </Text>

            <Text style={smallPrint}>
              Oder kopiere diesen Link in deinen Browser:
              <br />
              <span style={linkText}>{akzeptierenUrl}</span>
            </Text>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              © {new Date().getFullYear()} Mietevo – Immobilienverwaltung
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const body: React.CSSProperties = {
  backgroundColor: "#f4f4f5",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  margin: 0,
  padding: "32px 0",
};

const container: React.CSSProperties = {
  maxWidth: "560px",
  margin: "0 auto",
};

const logoSection: React.CSSProperties = {
  textAlign: "center",
  marginBottom: "24px",
};

const logoText: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: "700",
  color: "#18181b",
  letterSpacing: "-0.5px",
  margin: 0,
};

const card: React.CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  padding: "40px 48px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)",
};

const heading: React.CSSProperties = {
  fontSize: "22px",
  fontWeight: "700",
  color: "#18181b",
  margin: "0 0 20px 0",
  lineHeight: "1.3",
};

const paragraph: React.CSSProperties = {
  fontSize: "15px",
  color: "#3f3f46",
  lineHeight: "1.6",
  margin: "0 0 16px 0",
};

const buttonSection: React.CSSProperties = {
  textAlign: "center",
  margin: "28px 0",
};

const button: React.CSSProperties = {
  backgroundColor: "#18181b",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: "600",
  padding: "14px 32px",
  textDecoration: "none",
  display: "inline-block",
};

const divider: React.CSSProperties = {
  borderColor: "#e4e4e7",
  margin: "24px 0",
};

const smallPrint: React.CSSProperties = {
  fontSize: "13px",
  color: "#71717a",
  lineHeight: "1.5",
  margin: "0 0 12px 0",
};

const linkText: React.CSSProperties = {
  color: "#3b82f6",
  wordBreak: "break-all",
  fontSize: "12px",
};

const footer: React.CSSProperties = {
  textAlign: "center",
  marginTop: "24px",
};

const footerText: React.CSSProperties = {
  fontSize: "12px",
  color: "#a1a1aa",
  margin: 0,
};
