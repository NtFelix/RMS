"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Building2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogHeader,
} from '@/components/ui/dialog';
import { PillTabSwitcher } from "@/components/ui/pill-tab-switcher";

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

  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loginIsLoading, setLoginIsLoading] = useState(false)

  const [registerEmail, setRegisterEmail] = useState("")
  const [registerPassword, setRegisterPassword] = useState("")
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("")
  const [registerError, setRegisterError] = useState<string | null>(null)
  const [registerIsLoading, setRegisterIsLoading] = useState(false)
  const [registerSuccessMessage, setRegisterSuccessMessage] = useState<string | null>(null);

  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("")
  const [forgotPasswordError, setForgotPasswordError] = useState<string | null>(null)
  const [forgotPasswordIsLoading, setForgotPasswordIsLoading] = useState(false)
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false)

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
        email: loginEmail,
        password: loginPassword,
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
      if (registerPassword !== registerConfirmPassword) {
        setRegisterError("Passwords do not match.");
        return;
      }

      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: registerEmail,
        password: registerPassword,
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
      <div className="flex justify-center mb-2">
        <Building2 className="h-10 w-10 text-primary" />
      </div>
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
      { id: 'login', label: 'Login', value: 'login' },
      { id: 'register', label: 'Register', value: 'register' }
    ];

    return (
      <div className="w-full">
        {/* Modern pill tab switcher with proper spacing */}
        <div className="flex justify-center px-6 pt-6 pb-4">
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
                <FormField
                  id="login-email"
                  label="E-Mail"
                  type="email"
                  placeholder="name@example.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                />
                <FormField
                  id="login-password"
                  label="Passwort"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  extraContent={
                    <Button 
                      variant="link" 
                      onClick={() => setActiveView('forgotPassword')} 
                      className="text-sm text-primary hover:underline p-0 h-auto"
                    >
                      Passwort vergessen?
                    </Button>
                  }
                />
                <Button type="submit" className="w-full" disabled={loginIsLoading}>
                  {loginIsLoading ? "Wird angemeldet..." : "Anmelden"}
                </Button>
              </AuthForm>
            </>
          )}
          
          {activeView === 'register' && (
            <>
              <AuthHeader 
                title="Registrieren"
                description="Erstellen Sie ein neues Konto, um loszulegen"
              />
              <AuthForm 
                onSubmit={handleRegister} 
                error={registerError}
                successMessage={registerSuccessMessage}
              >
                <FormField
                  id="register-email"
                  label="E-Mail"
                  type="email"
                  placeholder="name@example.com"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  required
                />
                <FormField
                  id="register-password"
                  label="Passwort"
                  type="password"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  required
                />
                <FormField
                  id="confirm-password"
                  label="Passwort bestätigen"
                  type="password"
                  value={registerConfirmPassword}
                  onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                  required
                />
                <Button type="submit" className="w-full" disabled={registerIsLoading}>
                  {registerIsLoading ? "Wird registriert..." : "Registrieren"}
                </Button>
              </AuthForm>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="p-0 w-full max-w-md">
        <Card className="mx-auto w-full max-w-md border-none">
          {renderContent()}
        </Card>
      </DialogContent>
    </Dialog>
  )
}
