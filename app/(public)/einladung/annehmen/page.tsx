"use client";

import { Suspense, useEffect, useState, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { acceptEinladungAction } from "./actions";
import { LOGO_URL } from "@/lib/constants";

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
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--muted-foreground)/0.15)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--muted-foreground)/0.15)_1px,transparent_1px)] bg-size-[4rem_4rem] mask-[radial-gradient(ellipse_80%_50%_at_50%_50%,black_40%,transparent_100%)]" />
      <div className="flex flex-col items-center gap-4 relative z-10">
        <svg
          className="animate-spin size-7 text-muted-foreground"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        <p className="text-sm text-muted-foreground">Einladung wird geladen…</p>
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
    if (!token) setStatus("no_token");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleAccept = () => {
    if (!token) return;
    setStatus("loading");
    startTransition(async () => {
      const result = await acceptEinladungAction(token);

      if (result.success) {
        setStatus("success");
      } else if (result.code === "not_authenticated") {
        setStatus("not_authenticated");
      } else {
        setStatus("error");
        setErrorMessage(result.error);
      }
    });
  };

  const handleLoginRedirect = () => {
    const redirectUrl = encodeURIComponent(`/einladung/annehmen?token=${token}`);
    router.push(`/auth/login?redirect=${redirectUrl}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 md:p-8 relative overflow-hidden">
      {/* Animated grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--muted-foreground)/0.15)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--muted-foreground)/0.15)_1px,transparent_1px)] bg-size-[4rem_4rem] mask-[radial-gradient(ellipse_80%_50%_at_50%_50%,black_40%,transparent_100%)]" />

      {/* Gradient orbs */}
      <motion.div
        className="hidden md:block absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/20 blur-[100px]"
        animate={{
          x: [0, 50, 0],
          y: [0, 30, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="hidden md:block absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-secondary/20 blur-[100px]"
        animate={{
          x: [0, -40, 0],
          y: [0, -50, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Radial spotlight */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--muted)/0.8)_0%,transparent_50%)]" />

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-5xl bg-card rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col lg:flex-row min-h-[600px]"
      >
        {/* Left - Hero / Branding */}
        <div className="hidden lg:flex relative lg:w-1/2 bg-linear-to-br from-primary via-secondary to-primary p-8 md:p-12 flex-col justify-between overflow-hidden perspective-[1000px]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(var(--accent)/0.3)_0%,transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,hsl(var(--primary)/0.4)_0%,transparent_50%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-size-[3rem_3rem] transform-[perspective(500px)_rotateX(20deg)_scale(1.2)] origin-top opacity-50" />

          <Link href="/" className="relative z-10 flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="p-1 rounded-xl bg-white/10 backdrop-blur-xs">
              <img src={LOGO_URL} alt="Mietevo Logo" className="h-8 w-8 object-contain" />
            </div>
            <span className="text-white font-semibold text-lg">Mietevo</span>
          </Link>

          <div className="relative z-10 py-8 lg:py-0">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight"
            >
              {status === "success"
                ? "Willkommen im Team!"
                : "Du wurdest eingeladen"}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="mt-6 text-white/80 text-base md:text-lg max-w-md leading-relaxed"
            >
              {status === "success"
                ? "Tritt deiner Organisation bei und verwalte gemeinsam eure Immobilien."
                : "Jemand möchte dich zu seiner Organisation auf Mietevo einladen."}
            </motion.p>
          </div>

          <div className="relative z-10" />
        </div>

        {/* Right - Status */}
        <div className="lg:w-1/2 p-6 md:p-12 flex flex-col justify-center bg-card">
          <div className="lg:hidden flex justify-center mb-8">
            <Link href="/" className="flex items-center gap-3">
              <div className="p-1 rounded-xl bg-primary/10">
                <img src={LOGO_URL} alt="Mietevo Logo" className="h-8 w-8 object-contain" />
              </div>
              <span className="text-foreground font-semibold text-lg">Mietevo</span>
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="max-w-sm mx-auto w-full"
          >
            {status === "idle" && (
              <StatusView
                icon={<MailIcon />}
                title="Einladung annehmen"
                description="Klicke auf den Button, um die Einladung anzunehmen und der Organisation beizutreten."
                action={
                  <Button
                    onClick={handleAccept}
                    className="w-full h-12 rounded-xl text-base font-semibold mt-6"
                  >
                    Einladung annehmen
                  </Button>
                }
              />
            )}

            {(status === "loading" || isPending) && (
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
                  <Button
                    onClick={() => router.push("/dashboard")}
                    className="w-full h-12 rounded-xl text-base font-semibold mt-6"
                  >
                    Zum Dashboard
                  </Button>
                }
                autoRedirect={{ href: "/dashboard", delayMs: 3000 }}
              />
            )}

            {status === "not_authenticated" && (
              <StatusView
                icon={<LockIcon />}
                title="Anmeldung erforderlich"
                description="Du musst dich mit der eingeladenen E-Mail-Adresse anmelden, um die Einladung anzunehmen."
                action={
                  <Button
                    onClick={handleLoginRedirect}
                    className="w-full h-12 rounded-xl text-base font-semibold mt-6"
                  >
                    Jetzt anmelden
                  </Button>
                }
              />
            )}

            {status === "error" && (
              <StatusView
                icon={<XCircle />}
                title="Einladung ungültig"
                description={errorMessage ?? "Die Einladung konnte nicht angenommen werden."}
                action={
                  <Button
                    onClick={() => router.push("/")}
                    variant="outline"
                    className="w-full h-12 rounded-xl text-base font-semibold mt-6"
                  >
                    Zur Startseite
                  </Button>
                }
              />
            )}

            {status === "no_token" && (
              <StatusView
                icon={<XCircle />}
                title="Kein Einladungslink"
                description="Der Link ist ungültig oder unvollständig. Bitte prüfe die E-Mail und öffne den Link erneut."
                action={
                  <Button
                    onClick={() => router.push("/")}
                    variant="outline"
                    className="w-full h-12 rounded-xl text-base font-semibold mt-6"
                  >
                    Zur Startseite
                  </Button>
                }
              />
            )}
          </motion.div>
        </div>
      </motion.div>
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
  const href = autoRedirect?.href;
  const delayMs = autoRedirect?.delayMs;

  useEffect(() => {
    if (!href || delayMs === undefined) return;
    const t = setTimeout(() => router.push(href), delayMs);
    return () => clearTimeout(t);
  }, [href, delayMs, router]);

  return (
    <div className="flex flex-col items-center text-center gap-4">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted">{icon}</div>
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">{title}</h1>
        <p className="mt-2 text-muted-foreground leading-relaxed">{description}</p>
      </div>
      {action}
    </div>
  );
}

// ─── Icons (inline SVG) ──────────────────────────────────────────────────────

function MailIcon() {
  return (
    <svg className="size-8 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22 6C22 4.9 21.1 4 20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6ZM20 6L12 11L4 6H20ZM20 18H4V8L12 13L20 8V18Z" fill="currentColor" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin size-7 text-muted-foreground"
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
