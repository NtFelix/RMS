
'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { driver } from 'driver.js';
import "driver.js/dist/driver.css";
import { useOnboardingStore } from '@/hooks/use-onboarding-store';
import { TOUR_STEPS } from '@/constants/onboarding-steps';
import { useTheme } from 'next-themes';

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

    useEffect(() => {
        // Initialize driver if not exists
        if (!driverRef.current) {
            driverRef.current = driver({
                animate: true,
                showProgress: true,
                allowClose: false, // Prevent closing by clicking outside or ESC
                // Handle button clicks
                onPrevClick: () => {
                    useOnboardingStore.getState().goToPreviousStep();
                },
                onDestroyStarted: () => {
                    // This is called when the driver is destroyed (e.g. by 'close' button or programmatically)
                    // We need to distinguish between explicit close and programatic destroy
                    // For now, assume if the user clicks 'Close', it triggers this.
                    if (useOnboardingStore.getState().isActive) {
                        stopTour();
                    }
                },
                popoverClass: theme === 'dark' ? 'driver-popover-dark' : '',
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
            if (driverRef.current) {
                driverRef.current.destroy();
                driverRef.current = null;
            }
        };
    }, [isActive, currentStepIndex, stopTour, theme, pathname, router]);

    return null;
}
