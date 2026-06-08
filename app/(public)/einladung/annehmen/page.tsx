"use client";

import { useEffect, useState, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { acceptEinladungAction } from "./actions";

type Status = "idle" | "loading" | "success" | "error" | "no_token" | "not_authenticated";

export default function EinladungAnnehmenPage() {
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
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <div className="w-full max-w-md">
        {/* Wordmark */}
        <p className="text-center text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-8 select-none">
          mietevo
        </p>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200/60 dark:border-zinc-800/60 p-8">
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
                <button
                  onClick={() => router.push("/organisation")}
                  className="mt-6 w-full rounded-xl bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 text-sm font-semibold py-3 hover:opacity-90 transition-opacity"
                >
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
                <button
                  onClick={handleLoginRedirect}
                  className="mt-6 w-full rounded-xl bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 text-sm font-semibold py-3 hover:opacity-90 transition-opacity"
                >
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
                <button
                  onClick={() => router.push("/")}
                  className="mt-6 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm font-semibold py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
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
                <button
                  onClick={() => router.push("/")}
                  className="mt-6 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm font-semibold py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Zur Startseite
                </button>
              }
            />
          )}
        </div>

        <p className="text-center text-xs text-zinc-400 dark:text-zinc-600 mt-6">
          © {new Date().getFullYear()} Mietevo – Immobilienverwaltung
        </p>
      </div>
    </div>
  );
}

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
    <div className="flex flex-col items-center text-center gap-4">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800">
        {icon}
      </div>
      <div>
        <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-1">{title}</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{description}</p>
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
