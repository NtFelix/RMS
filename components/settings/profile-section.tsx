"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from 'next/navigation'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ConfirmationAlertDialog } from "@/components/ui/confirmation-alert-dialog";
import { createClient } from "@/utils/supabase/client"
import { Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteAccountOtpModal } from "@/components/modals/delete-account-otp-modal";
import type { UserProfileWithSubscription } from '@/types/user';
import { getBillingAddress, updateBillingAddress } from '@/app/user-profile-actions';
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from "@/components/ui/select";
import { BILLING_COUNTRIES } from "@/lib/constants";
import { SettingsCard, SettingsSection } from "@/components/settings/shared";
import { useSettingsData } from "@/components/settings/settings-data-context";
import { useAuth } from "@/components/auth/auth-provider";

const ProfileSection = () => {
  const supabase = useMemo(() => createClient(), []);
  const { toast } = useToast()
  const router = useRouter()
  
  // Use global context values
  const { user } = useAuth()
  const {
    profile,
    billingAddress: cachedBillingAddress,
    isLoading: isSettingsLoading,
    isBillingLoading: isCachedBillingLoading,
    refreshData: refreshUserProfile
  } = useSettingsData()

  const [firstName, setFirstName] = useState<string>("")
  const [lastName, setLastName] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)
  const [isSavingBilling, setIsSavingBilling] = useState<boolean>(false);
  const [billingAddress, setBillingAddress] = useState<{
    name: string;
    companyName: string;
    line1: string;
    line2: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  }>({
    name: "",
    companyName: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "DE", // Default to Germany
  });
  const [isAddressComplete, setIsAddressComplete] = useState(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false)
  const [showDeleteAccountConfirmModal, setShowDeleteAccountConfirmModal] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);

  // Load name values immediately on mount to ensure fresh metadata
  useEffect(() => {
    let isMounted = true;
    supabase.auth.getUser().then(res => {
      const freshUser = res.data.user
      if (freshUser && isMounted) {
        setFirstName(freshUser.user_metadata?.first_name || "")
        setLastName(freshUser.user_metadata?.last_name || "")
      }
    });
    return () => {
      isMounted = false;
    };
  }, [supabase]);

  // Load billing address values immediately when settings context resolves
  useEffect(() => {
    if (cachedBillingAddress) {
      setBillingAddress(prev => ({
        ...prev,
        name: cachedBillingAddress.name || '',
        companyName: cachedBillingAddress.companyName || '',
        line1: cachedBillingAddress.address?.line1 || '',
        line2: cachedBillingAddress.address?.line2 || '',
        city: cachedBillingAddress.address?.city || '',
        state: cachedBillingAddress.address?.state || '',
        postal_code: cachedBillingAddress.address?.postal_code || '',
        country: cachedBillingAddress.address?.country || 'DE',
      }));

      if (
        cachedBillingAddress.address?.line1 &&
        cachedBillingAddress.address.city &&
        cachedBillingAddress.address.postal_code &&
        cachedBillingAddress.address.country
      ) {
        setIsAddressComplete(true);
      }
    }
  }, [cachedBillingAddress]);

  const handleConfirmDeleteAccount = async (otp: string) => {
    setIsDeleting(true);
    try {
      if (!user || !user.email) {
        console.error("Error fetching user for account deletion verification");
        toast({
          title: "Fehler",
          description: "Benutzer konnte nicht identifiziert werden.",
          variant: "destructive",
        });
        setIsDeleting(false);
        return;
      }

      // Step 1: Verify OTP using reauthentication nonce via updateUser
      const userEmail = user.email.trim().toLowerCase();

      // reauthenticate() sends a nonce that is consumed by updateUser to authorize changes.
      // We call updateUser with the nonce to verify it. If it succeeds, the nonce was valid.
      const { error: reauthError } = await supabase.auth.updateUser({
        nonce: otp.trim()
      });

      if (reauthError) {
        console.error("Reauth Verification Error details:", JSON.stringify(reauthError, null, 2));
        toast({
          title: "Fehler",
          description: `Ungültiger Bestätigungscode: ${reauthError.message}`,
          variant: "destructive",
        });
        setIsDeleting(false);
        return;
      }

      // Step 2: Call the edge function to delete the user and storage
      const localSupabase = createClient();
      const { error: functionError } = await localSupabase.functions.invoke("delete-user-account", {});

      if (functionError) {
        toast({
          title: "Fehler",
          description: `Fehler beim Löschen des Kontos: ${functionError.message}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erfolg",
          description: "Ihr Konto wurde erfolgreich gelöscht. Sie werden abgemeldet.",
          variant: "success",
        });
        const { error: signOutError } = await localSupabase.auth.signOut();
        if (signOutError) {
          console.error("Error signing out after account deletion:", signOutError);
        }
        setShowOtpModal(false);
        router.push("/auth/login");
      }
    } catch (error) {
      console.error("Delete account exception:", error);
      toast({
        title: "Fehler",
        description: "Ein unerwarteter Fehler ist beim Löschen des Kontos aufgetreten.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAccountInitiation = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    setShowOtpModal(false);
    try {
      const { error } = await supabase.auth.reauthenticate();

      if (error) {
        console.error("Reauthentication Initiation Error:", error);
        toast({
          title: "Fehler",
          description: `Fehler bei der erneuten Authentifizierung: ${error.message}`,
          variant: "destructive",
        });
      } else {
        setShowOtpModal(true);
        toast({
          title: "Erfolg",
          description: "Bestätigungscode wurde an Ihre E-Mail gesendet. Bitte Code unten eingeben.",
          variant: "success",
        });
        setShowDeleteAccountConfirmModal(false);
      }
    } catch (error) {
      console.error("Reauthentication exception:", error);
      toast({
        title: "Fehler",
        description: "Ein unerwarteter Fehler ist bei der erneuten Authentifizierung aufgetreten.",
        variant: "destructive",
      });
      setShowOtpModal(false);
      setShowDeleteAccountConfirmModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleProfileSave = async () => {
    setLoading(true)
    const { data, error } = await supabase.auth.updateUser({ data: { first_name: firstName, last_name: lastName } })
    setLoading(false)
    if (error) {
      toast({
        title: "Fehler",
        description: "Fehler beim Profil speichern",
        variant: "destructive",
      })
    } else if (data.user) {
      const savedFirstName = data.user.user_metadata.first_name ?? '';
      const savedLastName = data.user.user_metadata.last_name ?? '';
      toast({
        title: "Erfolg",
        description: `Hallo ${savedFirstName} ${savedLastName}, Ihr Profil wurde erfolgreich gespeichert.`,
        variant: "success",
      })
    } else {
      toast({
        title: "Erfolg",
        description: "Profil gespeichert",
        variant: "success",
      })
    }
  }

  const handleBillingAddressSave = async () => {
    if (!profile?.stripe_customer_id) {
      toast({
        title: "Fehler",
        description: "Stripe-Kunden-ID nicht gefunden.",
        variant: "destructive",
      });
      return;
    }

    const requiredFields = [
      billingAddress.name,
      billingAddress.line1,
      billingAddress.city,
      billingAddress.postal_code,
      billingAddress.country
    ];

    const allFieldsFilled = requiredFields.every(field => Boolean(field));

    if (!allFieldsFilled) {
      toast({
        title: "Fehler",
        description: "Bitte füllen Sie alle erforderlichen Adressfelder aus.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingBilling(true);

    try {
      const result = await updateBillingAddress(
        profile.stripe_customer_id,
        {
          name: billingAddress.name,
          address: {
            line1: billingAddress.line1,
            line2: billingAddress.line2 || '',
            city: billingAddress.city,
            state: billingAddress.state || '',
            postal_code: billingAddress.postal_code,
            country: billingAddress.country,
          },
          companyName: billingAddress.companyName || '',
        }
      );

      setIsAddressComplete(allFieldsFilled);

      if (result.success) {
        toast({
          title: "Erfolg",
          description: "Ihre Rechnungsadresse wurde erfolgreich gespeichert.",
          variant: "success",
        });
        await refreshUserProfile();
      } else {
        throw new Error(result.error || "Ein unbekannter Fehler ist aufgetreten.");
      }
    } catch (error) {
      toast({
        title: "Fehler",
        description: `Fehler beim Speichern der Rechnungsadresse: ${(error as Error).message}`,
        variant: "destructive",
      });
    } finally {
      setIsSavingBilling(false);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <SettingsSection
          title="Persönliche Informationen"
          description="Verwalten Sie Ihre Profildaten und persönlichen Informationen."
        >
          <SettingsCard>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Vorname
                </label>
                <Input
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className="w-full"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Nachname
                </label>
                <Input
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className="w-full"
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Dieser Name wird für die Betriebskostenabrechnung verwendet.
                </p>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <Button onClick={handleProfileSave} disabled={loading} size="sm">
                {loading ? "Speichern..." : "Profil speichern"}
              </Button>
            </div>
          </SettingsCard>
        </SettingsSection>

        <SettingsSection
          title="Rechnungsadresse"
          description="Verwalten Sie Ihre Rechnungsadresse für Rechnungen."
        >
          <SettingsCard>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Company Name */}
                <div className="space-y-2">
                  <label htmlFor="companyName" className="text-sm font-medium leading-none">
                    Firmenname (optional)
                  </label>
                  <div className="relative">
                    <Input
                      id="companyName"
                      value={billingAddress.companyName || ''}
                      onChange={(e) => setBillingAddress(prev => ({ ...prev, companyName: e.target.value }))}
                      placeholder="Firmenname"
                      className="w-full"
                      disabled={isSettingsLoading || isCachedBillingLoading || isSavingBilling}
                    />
                    {(isSettingsLoading || isCachedBillingLoading) && (
                      <div className="absolute inset-0 bg-muted/20 animate-pulse rounded-lg pointer-events-none" />
                    )}
                  </div>
                </div>

                {/* Recipient Name */}
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium leading-none">
                    Name <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      id="name"
                      value={billingAddress.name || ''}
                      onChange={(e) => setBillingAddress(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Vor- und Nachname"
                      className="w-full"
                      required
                      disabled={isSettingsLoading || isCachedBillingLoading || isSavingBilling}
                    />
                    {(isSettingsLoading || isCachedBillingLoading) && (
                      <div className="absolute inset-0 bg-muted/20 animate-pulse rounded-lg pointer-events-none" />
                    )}
                  </div>
                </div>
              </div>

              {/* Address Line 1 */}
              <div className="space-y-2">
                <label htmlFor="line1" className="text-sm font-medium leading-none">
                  Straße und Hausnummer <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <Input
                    id="line1"
                    value={billingAddress.line1 || ''}
                    onChange={(e) => setBillingAddress(prev => ({ ...prev, line1: e.target.value }))}
                    placeholder="Musterstraße 123"
                    className="w-full"
                    required
                    disabled={isSettingsLoading || isCachedBillingLoading || isSavingBilling}
                  />
                  {(isSettingsLoading || isCachedBillingLoading) && (
                    <div className="absolute inset-0 bg-muted/20 animate-pulse rounded-lg pointer-events-none" />
                  )}
                </div>
              </div>

              {/* Address Line 2 */}
              <div className="space-y-2">
                <label htmlFor="line2" className="text-sm font-medium leading-none">
                  Adresszeile 2 (optional)
                </label>
                <div className="relative">
                  <Input
                    id="line2"
                    value={billingAddress.line2 || ''}
                    onChange={(e) => setBillingAddress(prev => ({ ...prev, line2: e.target.value }))}
                    placeholder="Zusätzliche Adresszeile"
                    className="w-full"
                    disabled={isSettingsLoading || isCachedBillingLoading || isSavingBilling}
                  />
                  {(isSettingsLoading || isCachedBillingLoading) && (
                    <div className="absolute inset-0 bg-muted/20 animate-pulse rounded-lg pointer-events-none" />
                  )}
                </div>
              </div>

              {/* Postal Code & City */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="postal_code" className="text-sm font-medium leading-none">
                    PLZ <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      id="postal_code"
                      value={billingAddress.postal_code || ''}
                      onChange={(e) => setBillingAddress(prev => ({ ...prev, postal_code: e.target.value }))}
                      placeholder="12345"
                      className="w-full"
                      required
                      disabled={isSettingsLoading || isCachedBillingLoading || isSavingBilling}
                    />
                    {(isSettingsLoading || isCachedBillingLoading) && (
                      <div className="absolute inset-0 bg-muted/20 animate-pulse rounded-lg pointer-events-none" />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="city" className="text-sm font-medium leading-none">
                    Stadt <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      id="city"
                      value={billingAddress.city || ''}
                      onChange={(e) => setBillingAddress(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="Musterstadt"
                      className="w-full"
                      required
                      disabled={isSettingsLoading || isCachedBillingLoading || isSavingBilling}
                    />
                    {(isSettingsLoading || isCachedBillingLoading) && (
                      <div className="absolute inset-0 bg-muted/20 animate-pulse rounded-lg pointer-events-none" />
                    )}
                  </div>
                </div>
              </div>

              {/* Country Selection */}
              <div className="space-y-2">
                <label htmlFor="country" className="text-sm font-medium leading-none">
                  Land <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <Select
                    value={billingAddress.country || 'DE'}
                    onValueChange={(value) => setBillingAddress(prev => ({ ...prev, country: value }))}
                    disabled={isSettingsLoading || isCachedBillingLoading || isSavingBilling}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Land auswählen" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] overflow-y-auto">
                      {BILLING_COUNTRIES.dach.map((country) => (
                        <SelectItem key={country.value} value={country.value}>
                          {country.label}
                        </SelectItem>
                      ))}

                      <SelectSeparator className="my-1" />

                      {BILLING_COUNTRIES.europe.map((country) => (
                        <SelectItem key={country.value} value={country.value}>
                          {country.label}
                        </SelectItem>
                      ))}

                      <SelectSeparator className="my-1" />

                      {BILLING_COUNTRIES.other.map((country) => (
                        <SelectItem key={country.value} value={country.value}>
                          {country.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(isSettingsLoading || isCachedBillingLoading) && (
                    <div className="absolute inset-0 bg-muted/20 animate-pulse rounded-lg pointer-events-none" />
                  )}
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4 font-normal">
                {isSettingsLoading || isCachedBillingLoading ? (
                  <Skeleton className="h-9 w-48" />
                ) : (
                  <Button
                    onClick={handleBillingAddressSave}
                    disabled={isSavingBilling || !billingAddress.name || !billingAddress.line1 || !billingAddress.postal_code || !billingAddress.city || !billingAddress.country}
                    size="sm"
                  >
                    {isSavingBilling ? "Speichern..." : "Rechnungsadresse speichern"}
                  </Button>
                )}
              </div>
            </div>
          </SettingsCard>
        </SettingsSection>

        <SettingsSection
          title="Gefährliche Aktionen"
          description="Irreversible Aktionen, die Ihr Konto dauerhaft beeinträchtigen."
        >
          <SettingsCard className="border-destructive/20 bg-destructive/5 hover:bg-destructive/10">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-destructive/10">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </div>
                <div className="flex-1 space-y-2">
                  <h4 className="text-sm font-medium text-destructive">Konto löschen</h4>
                  <p className="text-sm text-muted-foreground">
                    Alle Ihre Daten, einschließlich Häuser, Wohnungen, Mieter und Finanzdaten, werden unwiderruflich entfernt. Dieser Vorgang kann nicht rückgängig gemacht werden.
                  </p>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDeleteAccountConfirmModal(true)}
                    disabled={isDeleting}
                    className="mt-3"
                  >
                    {isDeleting ? "Wird vorbereitet..." : "Konto löschen"}
                  </Button>
                </div>
              </div>
            </div>
          </SettingsCard>
        </SettingsSection>
      </div>
      <DeleteAccountOtpModal
        isOpen={showOtpModal}
        onOpenChange={setShowOtpModal}
        onConfirm={handleConfirmDeleteAccount}
        isDeleting={isDeleting}
      />
      <ConfirmationAlertDialog
        isOpen={showDeleteAccountConfirmModal}
        onOpenChange={setShowDeleteAccountConfirmModal}
        title="Konto wirklich löschen?"
        description="Sind Sie sicher, dass Sie Ihr Konto endgültig löschen möchten? Dieser Schritt startet den Prozess zur sicheren Entfernung Ihrer Daten. Sie erhalten anschließend eine E-Mail zur Bestätigung."
        onConfirm={handleDeleteAccountInitiation}
        isDeleting={isDeleting}
        confirmButtonText="Löschen einleiten"
        cancelButtonText="Abbrechen"
        confirmButtonVariant="destructive"
      />
    </>
  )
}

export default ProfileSection;
