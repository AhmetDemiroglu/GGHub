"use client";

import { MessageSquare } from "lucide-react";
import { useI18n } from "@/core/contexts/locale-context";

export default function MessagesPage() {
    const t = useI18n();

    return (
        <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-muted/50">
                    <MessageSquare className="h-10 w-10 text-muted-foreground" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold">{t("messages.yourMessages")}</h2>
                    <p className="text-sm text-muted-foreground mt-1">{t("messages.selectConversation")}</p>
                </div>
            </div>
        </div>
    );
}
