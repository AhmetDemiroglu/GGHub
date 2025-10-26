"use client";

import { MessageSquare } from "lucide-react";

export default function MessagesPage() {
    return (
        <div className="flex items-center justify-center h-full bg-background">
            <div className="text-center space-y-4">
                <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground" />
                <div>
                    <h2 className="text-xl font-semibold">Mesajlarınız</h2>
                    <p className="text-sm text-muted-foreground mt-2">
                        Bir konuşma seçin veya yeni bir mesaj gönderin.
                    </p>
                </div>
            </div>
        </div>
    );
}