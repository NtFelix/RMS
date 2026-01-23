"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { LOGO_URL } from "@/lib/constants"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PillTabSwitcher } from "@/components/ui/pill-tab-switcher";
import { handleGoogleSignIn, handleMicrosoftSignIn } from "@/lib/auth-helpers"
import { GoogleIcon } from "@/components/icons/google-icon"
import { MicrosoftIcon } from "@/components/icons/microsoft-icon"
import { Loader2 } from "lucide-react"

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: () => void;
  initialTab?: 'login' | 'register';
}

export default function AuthModal({
  isOpen,
  onClose,
  onAuthenticated,
  initialTab = 'login',
}: AuthModalProps) {
  const router = useRouter()

  const loginEmailRef = React.useRef<HTMLInputElement>(null);
  const loginPasswordRef = React.useRef<HTMLInputElement>(null);
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loginIsLoading, setLoginIsLoading] = useState(false)

  const registerEmailRef = React.useRef<HTMLInputElement>(null);
  const registerPasswordRef = React.useRef<HTMLInputElement>(null);
  const confirmPasswordRef = React.useRef<HTMLInputElement>(null);
  const [registerError, setRegisterError] = useState<string | null>(null)
  const [registerIsLoading, setRegisterIsLoading] = useState(false)
  const [registerSuccessMessage, setRegisterSuccessMessage] = useState<string | null>(null);
  const [agbAccepted, setAgbAccepted] = useState(false);

  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("")
  const [forgotPasswordError, setForgotPasswordError] = useState<string | null>(null)
  const [forgotPasswordIsLoading, setForgotPasswordIsLoading] = useState(false)
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false)

  const isGoogleLoginEnabled = true
  const isMicrosoftLoginEnabled = true
  const [socialLoading, setSocialLoading] = useState<string | null>(null) // 'google' | 'microsoft' | null

  const enabledProvidersCount = [isGoogleLoginEnabled, isMicrosoftLoginEnabled].filter(Boolean).length;

  const handleSocialAuth = async (provider: 'google' | 'microsoft', flow: 'login' | 'signup') => {
    setSocialLoading(provider);
    const errorSetter = flow === 'login' ? setLoginError : setRegisterError;
    errorSetter(null);

    const handler = provider === 'google' ? handleGoogleSignIn : handleMicrosoftSignIn;
    const { error } = await handler(flow);

    if (error) {
      errorSetter(error);
      setSocialLoading(null);
    }
  };

  const socialProviders = [
    {
      id: 'google' as const,
      name: 'Google',
      fullLabel: 'Mit Google anmelden',
      Icon: GoogleIcon,
      enabled: isGoogleLoginEnabled,
    },
    {
      id: 'microsoft' as const,
      name: 'Microsoft',
      fullLabel: 'Mit Microsoft anmelden',
      Icon: MicrosoftIcon,
      enabled: isMicrosoftLoginEnabled,
    }
  ].filter(p => p.enabled);

  const [activeView, setActiveView] = useState<'login' | 'register' | 'forgotPassword'>(initialTab);

  useEffect(() => {
    // Always set the active view based on initialTab prop
    setActiveView(initialTab);
    // When the modal opens, clear transient states like errors, success messages, and loading indicators.
    // Input fields are intentionally kept to allow users to resume typing if they close and reopen.
    if (isOpen) {
      setLoginError(null);
      setLoginIsLoading(false);
      setRegisterError(null);
      setRegisterIsLoading(false);
      setRegisterSuccessMessage(null);
      setAgbAccepted(false);
      setForgotPasswordError(null);
      setForgotPasswordIsLoading(false);
      setForgotPasswordSuccess(false);
    }
  }, [isOpen, initialTab]);


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginIsLoading(true)
    setLoginError(null)

    try {
      const supabase = createClient()

      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmailRef.current?.value || '',
        password: loginPasswordRef.current?.value || '',
      })

      if (error) {
        setLoginError(error.message)
        return
      }

      onAuthenticated();
      onClose();
    } finally {
      setLoginIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterIsLoading(true);
    setRegisterError(null);
    setRegisterSuccessMessage(null);

    try {
      const email = registerEmailRef.current?.value || '';
      const password = registerPasswordRef.current?.value || '';
      const confirmPassword = confirmPasswordRef.current?.value || '';

      if (password !== confirmPassword) {
        setRegisterError("Passwords do not match.");
        return;
      }

      if (!agbAccepted) {
        setRegisterError("Sie müssen die Allgemeinen Geschäftsbedingungen akzeptieren.");
        return;
      }

      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setRegisterError(error.message);
        return;
      }

      if (data.session) {
        // User is logged in (e.g., email confirmation is disabled)
        setRegisterSuccessMessage('Registration successful! You are now logged in.');
        onAuthenticated();
        onClose();
      } else if (data.user) {
        // Email confirmation is required
        setRegisterSuccessMessage("Registration successful! Please check your email to confirm your account.");
      } else {
        setRegisterError("An unexpected error occurred during registration.");
      }
    } finally {
      setRegisterIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotPasswordIsLoading(true)
    setForgotPasswordError(null)
    setForgotPasswordSuccess(false)

    try {
      const supabase = createClient()

      const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      })

      if (error) {
        setForgotPasswordError(error.message)
      } else {
        setForgotPasswordSuccess(true)
      }
    } finally {
      setForgotPasswordIsLoading(false)
    }
  }

  // Common header component to reduce duplication
  const AuthHeader = ({ title, description }: { title: string; description: string }) => (
    <CardHeader className="space-y-1 text-center px-6 pt-2">
      <Link href="/" className="flex justify-center mb-2 hover:opacity-80 transition-opacity">
        {/* Using native img tag: Image is already optimized (AVIF format) and served from Supabase CDN. 
            next/image adds unnecessary overhead for small, pre-optimized images. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO_URL} alt="Mietevo Logo" className="h-12 w-12 object-contain" />
      </Link>
      <CardTitle className="text-2xl font-bold">{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
  );

  // Common form wrapper to reduce duplication
  const AuthForm = ({
    onSubmit,
    error,
    successMessage,
    children
  }: {
    onSubmit: (e: React.FormEvent) => void;
    error: string | null;
    successMessage?: string | null;
    children: React.ReactNode;
  }) => (
    <CardContent className="px-6 pb-6">
      <form onSubmit={onSubmit} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {successMessage && (
          <Alert variant="default">
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}
        {children}
      </form>
    </CardContent>
  );

  // Common input field component
  const FormField = ({
    id,
    label,
    type = "text",
    placeholder,
    value,
    onChange,
    required = false,
    extraContent
  }: {
    id: string;
    label: string;
    type?: string;
    placeholder?: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    required?: boolean;
    extraContent?: React.ReactNode;
  }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        {extraContent}
      </div>
      <Input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
      />
    </div>
  );

  const renderContent = () => {
    if (activeView === 'forgotPassword') {
      return (
        <CardContent>
          <AuthHeader
            title="Passwort zurücksetzen"
            description="Geben Sie Ihre E-Mail-Adresse ein, um einen Link zum Zurücksetzen des Passworts zu erhalten"
          />
          {forgotPasswordSuccess ? (
            <Alert variant="default">
              <AlertDescription>
                Wenn ein Konto mit dieser E-Mail-Adresse existiert, erhalten Sie eine E-Mail mit Anweisungen zum Zurücksetzen Ihres Passworts.
              </AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              {forgotPasswordError && (
                <Alert variant="destructive">
                  <AlertDescription>{forgotPasswordError}</AlertDescription>
                </Alert>
              )}
              <FormField
                id="forgot-password-email"
                label="E-Mail"
                type="email"
                placeholder="name@example.com"
                value={forgotPasswordEmail}
                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                required
              />
              <Button type="submit" className="w-full" disabled={forgotPasswordIsLoading}>
                {forgotPasswordIsLoading ? "Wird gesendet..." : "Link zum Zurücksetzen senden"}
              </Button>
            </form>
          )}
          <Button variant="link" onClick={() => setActiveView('login')} className="w-full mt-4">
            Zurück zum Login
          </Button>
        </CardContent>
      )
    }

    const tabs = [
      { id: 'login', label: 'Anmelden', value: 'login' },
      { id: 'register', label: 'Registrieren', value: 'register' }
    ];

    return (
      <div className="w-full">
        {/* Modern pill tab switcher with proper spacing */}
        <div className="flex justify-center px-2 pt-6 pb-4">
          <PillTabSwitcher
            tabs={tabs}
            activeTab={activeView}
            onTabChange={(value) => setActiveView(value as 'login' | 'register')}
          />
        </div>

        {/* Tab content with consistent spacing */}
        <div className="px-0">
          {activeView === 'login' && (
            <>
              <AuthHeader
                title="Anmelden"
                description="Geben Sie Ihre E-Mail-Adresse und Ihr Passwort ein, um sich anzumelden"
              />
              <AuthForm onSubmit={handleLogin} error={loginError}>
                <div className="space-y-2">
                  <Label htmlFor="login-email">E-Mail</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="name@example.com"
                    ref={loginEmailRef}
                    required
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Passwort</Label>
                  <Input
                    id="login-password"
                    type="password"
                    ref={loginPasswordRef}
                    required
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.currentTarget.form?.requestSubmit();
                      }
                    }}
                  />
                  <Button
                    variant="link"
                    onClick={() => setActiveView('forgotPassword')}
                    className="text-sm text-primary hover:underline p-0 h-auto"
                    type="button"
                  >
                    Passwort vergessen?
                  </Button>
                </div>
                <Button type="submit" className="w-full" disabled={loginIsLoading}>
                  {loginIsLoading ? "Wird angemeldet..." : "Anmelden"}
                </Button>

                {true && (
                  <div className="pt-2 space-y-3">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">WEITERE ANMELDEMETHODEN</span>
                      </div>
                    </div>

                    <div className={enabledProvidersCount > 1 ? "flex gap-3" : "space-y-3"}>
                      {socialProviders.map((provider) => (
                        <Button
                          key={provider.id}
                          type="button"
                          variant="outline"
                          className={`${enabledProvidersCount > 1 ? "flex-1 px-0" : "w-full"} h-10 rounded-lg text-sm font-medium border-border hover:bg-muted/50 transition-colors`}
                          onClick={() => handleSocialAuth(provider.id, 'login')}
                          disabled={socialLoading !== null}
                        >
                          {socialLoading === provider.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <provider.Icon className="h-4 w-4 mr-2" />
                          )}
                          {enabledProvidersCount > 1 ? provider.name : provider.fullLabel}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </AuthForm>
            </>
          )}

          {activeView === 'register' && (
            <>
              <AuthHeader
                title="Registrieren"
                description="Erstellen Sie ein neues Konto, um loszulegen"
              />
              <CardContent className="px-6 pb-6">
                <form onSubmit={handleRegister} className="space-y-4">
                  {registerError && (
                    <Alert variant="destructive">
                      <AlertDescription>{registerError}</AlertDescription>
                    </Alert>
                  )}
                  {registerSuccessMessage && (
                    <Alert variant="default">
                      <AlertDescription>{registerSuccessMessage}</AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="register-email">E-Mail</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="name@example.com"
                      ref={registerEmailRef}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Passwort</Label>
                    <Input
                      id="register-password"
                      type="password"
                      ref={registerPasswordRef}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Passwort bestätigen</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      ref={confirmPasswordRef}
                      required
                    />
                  </div>
                  <div className="flex items-start space-x-3 mt-4">
                    <Checkbox
                      id="agb-checkbox"
                      checked={agbAccepted}
                      onCheckedChange={(checked) => setAgbAccepted(checked === true)}
                      className="mt-0.5"
                    />
                    <Label htmlFor="agb-checkbox" className="text-sm leading-relaxed peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Ich akzeptiere die{" "}
                      <Link
                        href="/agb"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline hover:no-underline"
                      >
                        Allgemeinen Geschäftsbedingungen
                      </Link>
                    </Label>
                  </div>
                  <Button type="submit" className="w-full" disabled={registerIsLoading || !agbAccepted}>
                    {registerIsLoading ? "Wird registriert..." : "Registrieren"}
                  </Button>

                  {true && (
                    <div className="pt-2 space-y-3">
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t border-border" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-card px-2 text-muted-foreground">WEITERE ANMELDEMETHODEN</span>
                        </div>
                      </div>

                      <div className={enabledProvidersCount > 1 ? "flex gap-3" : "space-y-3"}>
                        {socialProviders.map((provider) => (
                          <Button
                            key={provider.id}
                            type="button"
                            variant="outline"
                            className={`${enabledProvidersCount > 1 ? "flex-1 px-0" : "w-full"} h-10 rounded-lg text-sm font-medium border-border hover:bg-muted/50 transition-colors`}
                            onClick={() => handleSocialAuth(provider.id, 'signup')}
                            disabled={socialLoading !== null}
                          >
                            {socialLoading === provider.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <provider.Icon className="h-4 w-4 mr-2" />
                            )}
                            {enabledProvidersCount > 1 ? provider.name : provider.fullLabel}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </form>
              </CardContent>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="p-0 w-full max-w-md">
        <DialogHeader className="sr-only">
          <DialogTitle>Authentication</DialogTitle>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  )
}
