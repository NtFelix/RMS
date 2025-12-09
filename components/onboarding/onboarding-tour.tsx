
'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { driver } from 'driver.js';
import "driver.js/dist/driver.css";
import "./onboarding.css";
import { useOnboardingStore } from '@/hooks/use-onboarding-store';
import { TOUR_STEPS } from '@/constants/onboarding-steps';
import { useTheme } from 'next-themes';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const waitForElement = (selector: string, timeout = 5000): Promise<Element> => {
    return new Promise((resolve, reject) => {
        const element = document.querySelector(selector);
        if (element) {
            return resolve(element);
        }

        const observer = new MutationObserver(() => {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
                observer.disconnect();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });

        setTimeout(() => {
            observer.disconnect();
            reject(new Error(`Element ${selector} not found within ${timeout}ms`));
        }, timeout);
    });
};

export function OnboardingTour() {
    const { isActive, currentStepIndex, stopTour } = useOnboardingStore();
    const driverRef = useRef<any>(null);
    const { theme } = useTheme();
    const router = useRouter();
    const pathname = usePathname();
    const [showCloseConfirm, setShowCloseConfirm] = useState(false);

    // Use refs to access current values in driver callbacks without closure staleness
    const pathnameRef = useRef(pathname);
    const routerRef = useRef(router);
    const setShowCloseConfirmRef = useRef(setShowCloseConfirm);

    useEffect(() => {
        pathnameRef.current = pathname;
        routerRef.current = router;
        setShowCloseConfirmRef.current = setShowCloseConfirm;
    }, [pathname, router, setShowCloseConfirm]);

    useEffect(() => {
        const checkOnboardingStatus = async () => {
            try {
                const response = await fetch('/api/user/onboarding');
                if (response.ok) {
                    const data = await response.json();
                    if (!data.completed && !useOnboardingStore.getState().isActive) {
                        useOnboardingStore.getState().startTour();
                    }
                }
            } catch (error) {
                console.error("Failed to check onboarding status:", error);
            }
        };

        checkOnboardingStatus();
    }, []);

    const handleConfirmClose = () => {
        // Mark onboarding as complete in the database
        fetch('/api/user/onboarding', { method: 'POST' }).catch(console.error);
        // Stop the tour
        useOnboardingStore.getState().stopTour();
        // Destroy driver
        if (driverRef.current) {
            driverRef.current.destroy();
        }
        setShowCloseConfirm(false);
    };

    const handleCancelClose = () => {
        setShowCloseConfirm(false);
        // Driver will be re-initialized by the useEffect since showCloseConfirm changes
    };

    useEffect(() => {
        // If confirmation dialog is open, do not run the driver
        if (showCloseConfirm) {
            return;
        }

        // Initialize driver if not exists
        if (!driverRef.current) {
            driverRef.current = driver({
                animate: true,
                showProgress: true,
                allowClose: false, // Prevent closing by clicking outside or ESC
                prevBtnText: 'Zurück', // Localize previous button text
                // Handle button clicks
                onPrevClick: () => {
                    useOnboardingStore.getState().goToPreviousStep();
                },
                onNextClick: () => {
                    const store = useOnboardingStore.getState();
                    const currentStep = TOUR_STEPS[store.currentStepIndex];
                    const currentPath = pathnameRef.current;

                    // If we are on a step that requires navigation and we are not there,
                    // "Next" means "Auto-Navigate"
                    if (currentStep && currentStep.path && currentPath !== currentStep.path) {
                        routerRef.current.push(currentStep.path);
                        // Do NOT advance step index yet, let the page load and show the step target
                    } else {
                        store.goToNextStep();
                    }
                },
                onCloseClick: () => {
                    // Destroy the driver completely to prevent z-index/focus issues with the modal
                    if (driverRef.current) {
                        driverRef.current.destroy();
                        driverRef.current = null;
                    }
                    // Show confirmation dialog
                    setShowCloseConfirmRef.current(true);
                },
                onDestroyStarted: () => {
                    // This is called when the driver is destroyed programmatically
                    // We handle explicit close via onCloseClick now
                },
                popoverClass: 'driverjs-theme', // Use our custom class
            });
        }


        const driverInstance = driverRef.current;

        const handleStep = async () => {
            if (isActive) {
                const step = TOUR_STEPS[currentStepIndex];
                if (step) {
                    try {
                        const buttons = [];
                        if (currentStepIndex > 0) {
                            buttons.push('previous');
                        }

                        // Add next button
                        // If it's the last step, driver.js automatically changes logic, but we handle it via store
                        buttons.push('next');

                        // Always show close button since allowClose is false
                        buttons.push('close');

                        // Check if we need to navigate
                        if (step.path && pathname !== step.path) {
                            const navId = `#sidebar-nav-${step.path.replace(/^\//, '')}`;
                            // Wait for sidebar element
                            await waitForElement(navId, 5000);

                            driverInstance.highlight({
                                element: navId,
                                popover: {
                                    title: "Weiter geht's",
                                    description: "Klicken Sie auf diesen Menüpunkt, um zum nächsten Schritt zu gelangen.",
                                    side: "right",
                                    align: 'center',
                                    showButtons: buttons,
                                    progressText: `${currentStepIndex + 1} von ${TOUR_STEPS.length}`,
                                    nextBtnText: 'Automatisch navigieren' // Clearer text
                                }
                            });
                            return; // Wait for user to navigate
                        }

                        // Wait for element to be present in DOM
                        await waitForElement(step.element, 5000);

                        // Use highlight to show the specific step
                        driverInstance.highlight({
                            element: step.element,
                            popover: {
                                title: step.title,
                                description: step.description,
                                side: "left",
                                align: 'start',
                                showButtons: buttons,
                                progressText: `${currentStepIndex + 1} von ${TOUR_STEPS.length}`,
                                nextBtnText: currentStepIndex === TOUR_STEPS.length - 1 ? 'Beenden' : 'Weiter'
                            }
                        });
                    } catch (e) {
                        console.warn(`Could not find element ${step.element} for step ${step.id}`);
                    }
                } else {
                    driverInstance.destroy();
                }
            } else {
                driverInstance.destroy();
            }
        };

        handleStep();


        return () => {
            // We do NOT destroy the driver here because recreating it resets config.
            // We only destroy if the component unmounts for real.
            // But here we used refs, so config is stable.
        };
    }, [isActive, currentStepIndex, stopTour, theme, pathname, router, showCloseConfirm]); // Re-run when these change

    // Clean up on unmount
    useEffect(() => {
        return () => {
            if (driverRef.current) {
                driverRef.current.destroy();
                driverRef.current = null;
            }
        };
    }, []);

    return (
        <AlertDialog open={showCloseConfirm} onOpenChange={(open) => !open && handleCancelClose()}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Einrichtung abbrechen?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Möchten Sie den Einrichtungsassistenten wirklich beenden?
                        Der Assistent wird als abgeschlossen markiert und Sie können ihn jederzeit in den Einstellungen neu starten.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={handleCancelClose}>Zurück zum Assistenten</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmClose}>
                        Einrichtung beenden
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

