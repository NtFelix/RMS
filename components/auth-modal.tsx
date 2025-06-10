'use client';

import { useState, useEffect, FormEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

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
  const supabase = createClient();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(initialTab);

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginSuccessMessage, setLoginSuccessMessage] = useState<string | null>(null);

  // Register state
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerSuccessMessage, setRegisterSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!isOpen) {
      // Reset states when modal is closed
      setLoginEmail('');
      setLoginPassword('');
      setLoginError(null);
      setLoginLoading(false);
      setLoginSuccessMessage(null);
      setRegisterEmail('');
      setRegisterPassword('');
      setConfirmPassword('');
      setRegisterError(null);
      setRegisterLoading(false);
      setRegisterSuccessMessage(null);
    }
  }, [isOpen]);

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    setLoginSuccessMessage(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });

    if (error) {
      setLoginError(error.message);
    } else {
      setLoginSuccessMessage('Login successful! Redirecting...');
      onAuthenticated();
      onClose(); // Close modal on success
    }
    setLoginLoading(false);
  };

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setRegisterLoading(true);
    setRegisterError(null);
    setRegisterSuccessMessage(null);

    if (registerPassword !== confirmPassword) {
      setRegisterError("Passwords do not match.");
      setRegisterLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: registerEmail,
      password: registerPassword,
      options: {
        // emailRedirectTo: `${window.location.origin}/auth/callback`, // Optional: if you have email confirmation setup
      },
    });

    if (error) {
      setRegisterError(error.message);
    } else if (data.user) {
      // For simplicity in this modal, we'll assume direct authentication.
      // In a real app, you might want to handle email confirmation.
      // If data.user is present and data.session is null, it means confirmation is required.
      if (data.session) {
        setRegisterSuccessMessage('Registration successful! You are now logged in.');
        onAuthenticated();
        onClose(); // Close modal on success
      } else {
        setRegisterSuccessMessage('Registration successful! Please check your email to confirm your account.');
        // Don't call onAuthenticated here, wait for email confirmation if that's your flow.
        // For this modal, we will call it to simulate immediate access.
        onAuthenticated();
        onClose();
      }
    }
    setRegisterLoading(false);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {activeTab === 'login' ? 'Login' : 'Create an Account'}
          </DialogTitle>
          <DialogDescription>
            {activeTab === 'login'
              ? "Access your account."
              : "Sign up to get started."}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'login' | 'register')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4">
              {loginError && (
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{loginError}</AlertDescription>
                </Alert>
              )}
              {loginSuccessMessage && (
                <Alert variant="default">
                  <AlertTitle>Success</AlertTitle>
                  <AlertDescription>{loginSuccessMessage}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-1">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="you@example.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  disabled={loginLoading}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  disabled={loginLoading}
                />
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full" disabled={loginLoading}>
                  {loginLoading ? 'Logging in...' : 'Login'}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
          <TabsContent value="register">
            <form onSubmit={handleRegister} className="space-y-4">
              {registerError && (
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{registerError}</AlertDescription>
                </Alert>
              )}
              {registerSuccessMessage && (
                <Alert variant="default">
                  <AlertTitle>Success</AlertTitle>
                  <AlertDescription>{registerSuccessMessage}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-1">
                <Label htmlFor="register-email">Email</Label>
                <Input
                  id="register-email"
                  type="email"
                  placeholder="you@example.com"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  required
                  disabled={registerLoading}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="register-password">Password</Label>
                <Input
                  id="register-password"
                  type="password"
                  placeholder="••••••••"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  required
                  disabled={registerLoading}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={registerLoading}
                />
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full" disabled={registerLoading}>
                  {registerLoading ? 'Registering...' : 'Create Account'}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
