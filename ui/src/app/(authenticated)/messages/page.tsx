"use client";

import { MessageSquare } from "lucide-react";
import { useI18n } from "@/core/contexts/locale-context";

export default function MessagesPage() {
    const t = useI18n();

    return (
        <div className="flex items-center justify-center h-full bg-background">
            <div className="text-center space-y-4">
                <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground" />
                <div>
                    <h2 className="text-xl font-semibold">{t("messages.yourMessages")}</h2>
                    <p className="text-sm text-muted-foreground mt-2">
                        {t("messages.selectConversation")}
                    </p>
                </div>
            </div>
        </div>
    );
}
