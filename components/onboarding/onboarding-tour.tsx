
'use client';

import { useEffect, useRef } from 'react';
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

    useEffect(() => {
        const checkOnboardingStatus = async () => {
            try {
                const response = await fetch('/api/user/onboarding');
                if (response.ok) {
                    const data = await response.json();
                    // If onboarding is not completed, start the tour
                    // This will force restart if closed early until completed
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
                allowClose: true,
                onDestroyStarted: () => {
                    // If the tour is active and we are destroying it (user clicked close),
                    // we should stop the tour in the store.
                    // Note: This callback might be triggered during programatic destroy too,
                    // so we need to be careful not to create loops.
                    // However, since we control 'isActive' in the dependency array,
                    // we can check if we initiated the destroy or the user did.
                    // For now, simpler is better: if it destroys, we ensure store is stopped.
                    if (useOnboardingStore.getState().isActive) {
                        stopTour();
                    }
                },
                // Custom styling helper class
                popoverClass: theme === 'dark' ? 'driver-popover-dark' : '',
            });
        }


        const driverInstance = driverRef.current;

        const handleStep = async () => {
            if (isActive) {
                const step = TOUR_STEPS[currentStepIndex];
                if (step) {
                    try {
                        // Wait for element to be present in DOM
                        await waitForElement(step.element, 5000);

                        // Use highlight to show the specific step
                        // We configure it to NOT show navigation buttons since we want auto-advance
                        driverInstance.highlight({
                            element: step.element,
                            popover: {
                                title: step.title,
                                description: step.description,
                                side: "left",
                                align: 'start',
                                showButtons: [], // Hide Next/Prev buttons
                                progressText: `${currentStepIndex + 1} von ${TOUR_STEPS.length}`,
                            }
                        });
                    } catch (e) {
                        console.warn(`Could not find element ${step.element} for step ${step.id}`);
                        // Optionally auto-skip or show error? For now just log.
                        // If we can't find the element, the tour might get stuck.
                        // We could skip to next step?
                        // useOnboardingStore.getState().completeStep(step.id);
                    }
                } else {
                    // Index out of bounds, maybe finished?
                    driverInstance.destroy();
                }
            } else {
                // If not active, ensure driver is destroyed
                driverInstance.destroy();
            }
        };

        handleStep();


        // Cleanup not strictly necessary for singleton but good practice if component unmounts
        return () => {
            if (driverRef.current) {
                driverRef.current.destroy();
                driverRef.current = null;
            }
        };
    }, [isActive, currentStepIndex, stopTour, theme]);

    return null;
}
