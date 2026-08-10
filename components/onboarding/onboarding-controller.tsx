'use client';

import { useEffect, useState } from 'react';
import { SetupWizard } from './setup-wizard';
import { OnboardingChecklist } from './onboarding-checklist';
import type { OnboardingChecklistStatus } from '@/lib/server/user-data';

interface OnboardingControllerProps {
    checklist: OnboardingChecklistStatus;
}

export function OnboardingController({ checklist }: OnboardingControllerProps) {
    const [showSetupWizard, setShowSetupWizard] = useState(false);

    useEffect(() => {
        // Skip the setup wizard on mobile devices without marking it as completed.
        // Users will see it when they return on desktop.
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
            return;
        }

        const checkSetupStatus = async () => {
            try {
                const response = await fetch('/api/user/setup');
                if (response.ok) {
                    const data = await response.json();
                    if (!data.setupCompleted) {
                        setShowSetupWizard(true);
                    }
                } else {
                    console.error('Failed to fetch setup status:', response.statusText);
                }
            } catch (error) {
                console.error('Failed to check setup status:', error);
            }
        };

        checkSetupStatus();
    }, []);

    return (
        <>
            <SetupWizard
                isOpen={showSetupWizard}
                onComplete={() => setShowSetupWizard(false)}
            />
            <OnboardingChecklist status={checklist} />
        </>
    );
}
