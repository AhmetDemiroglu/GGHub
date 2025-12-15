import { RefreshCw } from "lucide-react";
import { forceSyncMetacritic } from "@/api/admin/admin.api";
import { toast } from "sonner";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const AdminGameRefreshButton = ({ gameId }: { gameId: number }) => {
    const [isTimingOut, setIsTimingOut] = useState(false);
    const queryClient = useQueryClient();

    const { mutate, isPending, reset } = useMutation({
        mutationFn: () => {
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Metacritic cevap vermedi. İşlem iptal edildi.")), 20000)
            );

            return Promise.race([
                forceSyncMetacritic(gameId),
                timeoutPromise
            ]);
        },
        onSuccess: (res: any) => {
            if (res?.data?.success) {
                toast.success("Senkronizasyon Başarılı");
                queryClient.invalidateQueries({ queryKey: ["game"] });
            }
        },
    });

    const handleRetry = () => {
        setIsTimingOut(false);
        reset();
        mutate();
    };

    return (
        <button
            onClick={() => isTimingOut ? handleRetry() : mutate()}
            disabled={isPending && !isTimingOut}
            className={`cursor-pointer flex items-center justify-center w-full h-full transition-colors ${isTimingOut ? "text-orange-500 hover:text-orange-400" : "text-red-500 hover:text-red-400"
                }`}
            title={isTimingOut ? "Zaman aşımı oldu. Tekrar dene?" : "Metacritic Puanını Senkronize Et"}
        >
            <RefreshCw
                size={20}
                className={isPending && !isTimingOut ? "animate-spin" : ""}
            />
        </button>
    );
};