"use client";

import { useEffect, useState } from "react";
import { useModalStore } from "@/hooks/use-modal-store";
import { fetchEmailById } from "@/lib/email-utils";
import { convertToLegacyMail } from "@/types/Mail";
import type { LegacyMail, Mail } from "@/types/Mail";
import dynamic from 'next/dynamic';
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/utils/supabase/client";

// Dynamic import of MailDetailPanel to keep bundle size small
const MailDetailPanel = dynamic(() => import("@/components/mail-detail-panel").then(mod => mod.MailDetailPanel), {
    ssr: false
});

export function MailPreviewModal() {
    const { isMailPreviewModalOpen, mailPreviewId, closeMailPreviewModal } = useModalStore();
    const [userId, setUserId] = useState<string | undefined>(undefined);
    const { toast } = useToast();

    // Fetch user ID on mount
    useEffect(() => {
        const getUserId = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
            }
        };
        getUserId();
    }, []);

    if (!isMailPreviewModalOpen || !mailPreviewId) return null;

    return (
        <MailDetailPanel
            mail={{ id: mailPreviewId }}
            userId={userId}
            onClose={closeMailPreviewModal}
        />
    );
}
