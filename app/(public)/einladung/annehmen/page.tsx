"use client";

import { Suspense, useEffect, useState, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { acceptEinladungAction } from "./actions";

type Status = "idle" | "loading" | "success" | "error" | "no_token" | "not_authenticated";

export default function EinladungAnnehmenPageWrapper() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <EinladungAnnehmenPage />
    </Suspense>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#f1f3f3" }}>
      <div className="flex flex-col items-center gap-4">
        <svg
          className="animate-spin size-7"
          style={{ color: "#6b7280" }}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        <p className="text-sm" style={{ color: "#6b7280" }}>Einladung wird geladen…</p>
      </div>
    </div>
  );
}

function EinladungAnnehmenPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!token) {
      setStatus("no_token");
      return;
    }

    setStatus("loading");

    startTransition(async () => {
      const result = await acceptEinladungAction(token);

      if (result.success) {
        setStatus("success");
      } else if (result.code === "not_authenticated") {
        // Redirect to login, then come back
        setStatus("not_authenticated");
      } else {
        setStatus("error");
        setErrorMessage(result.error);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleLoginRedirect = () => {
    const redirectUrl = encodeURIComponent(`/einladung/annehmen?token=${token}`);
    router.push(`/auth/login?redirect=${redirectUrl}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#f1f3f3" }}>
      <div className="w-full max-w-[600px]">
        {/* Logo */}
        <div className="text-center mb-[35px]">
          <img
            src="https://ocubnwzybybcbrhsnqqs.supabase.co/storage/v1/object/public/pwa-images/favicon/favicon.png"
            alt="Mietevo Mascot"
            className="w-[90px] h-[90px] mx-auto block rounded-[20px]"
            style={{ boxShadow: "0 10px 15px -3px rgba(43,62,79,0.2)" }}
          />
        </div>

        <div
          className="bg-white p-10"
          style={{
            borderRadius: "24px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
            border: "1px solid #e5e7eb",
          }}
        >
          {(status === "idle" || status === "loading" || isPending) && (
            <StatusView
              icon={<Spinner />}
              title="Einladung wird verarbeitet…"
              description="Bitte warte einen Moment."
            />
          )}

          {status === "success" && (
            <StatusView
              icon={<CheckCircle />}
              title="Erfolgreich beigetreten!"
              description="Du bist der Organisation beigetreten. Du wirst zum Dashboard weitergeleitet."
              action={
                <button onClick={() => router.push("/organisation")} className="mt-6" style={btnBaseStyle}>
                  Zum Dashboard
                </button>
              }
              autoRedirect={{ href: "/organisation", delayMs: 3000 }}
            />
          )}

          {status === "not_authenticated" && (
            <StatusView
              icon={<LockIcon />}
              title="Anmeldung erforderlich"
              description="Du musst dich mit der eingeladenen E-Mail-Adresse anmelden, um die Einladung anzunehmen."
              action={
                <button onClick={handleLoginRedirect} className="mt-6" style={btnBaseStyle}>
                  Jetzt anmelden
                </button>
              }
            />
          )}

          {status === "error" && (
            <StatusView
              icon={<XCircle />}
              title="Einladung ungültig"
              description={errorMessage ?? "Die Einladung konnte nicht angenommen werden."}
              action={
                <button onClick={() => router.push("/")} className="mt-6" style={btnBaseStyle}>
                  Zur Startseite
                </button>
              }
            />
          )}

          {status === "no_token" && (
            <StatusView
              icon={<XCircle />}
              title="Kein Einladungslink"
              description="Der Link ist ungültig oder unvollständig. Bitte prüfe die E-Mail und öffne den Link erneut."
              action={
                <button onClick={() => router.push("/")} className="mt-6" style={btnBaseStyle}>
                  Zur Startseite
                </button>
              }
            />
          )}
        </div>

        <p className="text-center mt-10 pt-[30px]" style={{ fontSize: "14px", color: "#6b7280", borderTop: "1px solid #e5e7eb" }}>
          Bei Fragen erreichst du uns unter{" "}
          <a href="mailto:support@mietevo.de" style={{ color: "#2b3e4f", textDecoration: "none", fontWeight: 600 }}>support@mietevo.de</a>
        </p>
        <p className="text-center mt-2" style={{ fontSize: "14px", color: "#6b7280" }}>
          &copy; {new Date().getFullYear()} Mietevo. Alle Rechte vorbehalten.
        </p>
      </div>
    </div>
  );
}

const btnBaseStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  backgroundColor: "#2b3e4f",
  color: "white",
  textDecoration: "none",
  padding: "18px 0",
  borderRadius: "20px",
  fontWeight: 600,
  fontSize: "18px",
  boxShadow: "0 10px 15px -3px rgba(43,62,79,0.3)",
  border: "none",
  cursor: "pointer",
  transition: "all 0.3s ease",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusView({
  icon,
  title,
  description,
  action,
  autoRedirect,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  autoRedirect?: { href: string; delayMs: number };
}) {
  const router = useRouter();

  useEffect(() => {
    if (!autoRedirect) return;
    const t = setTimeout(() => router.push(autoRedirect.href), autoRedirect.delayMs);
    return () => clearTimeout(t);
  }, [autoRedirect, router]);

  return (
    <div className="flex flex-col items-center text-center" style={{ gap: "16px" }}>
      <div className="flex items-center justify-center w-16 h-16 rounded-full" style={{ backgroundColor: "#f1f3f3" }}>
        {icon}
      </div>
      <div>
        <h1 style={{ color: "#2b3e4f", fontSize: "28px", fontWeight: 800, letterSpacing: "-0.025em", marginBottom: "20px" }}>{title}</h1>
        <p style={{ fontSize: "16px", color: "#2b3e4f", lineHeight: 1.7, margin: 0 }}>{description}</p>
      </div>
      {action}
    </div>
  );
}

// ─── Icons (inline SVG — no extra dependency) ────────────────────────────────

function Spinner() {
  return (
    <svg
      className="animate-spin size-7 text-zinc-500"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

function CheckCircle() {
  return (
    <svg className="size-8 text-emerald-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg className="size-8 text-amber-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 11V7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7V11M5 11H19C19.5523 11 20 11.4477 20 12V20C20 20.5523 19.5523 21 19 21H5C4.44772 21 4 20.5523 4 20V12C4 11.4477 4.44772 11 5 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function XCircle() {
  return (
    <svg className="size-8 text-red-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 9L9 15M9 9L15 15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
