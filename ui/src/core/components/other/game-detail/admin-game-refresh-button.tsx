import { RefreshCw } from "lucide-react";
import { forceSyncMetacritic } from "@/api/admin/admin.api";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const AdminGameRefreshButton = ({ gameId }: { gameId: number }) => {
    const queryClient = useQueryClient();

    const { mutate, isPending } = useMutation({
        mutationFn: () => forceSyncMetacritic(gameId),

        onSuccess: (res: any) => {
            if (res?.data?.success) {
                toast.success("Senkronizasyon Başarılı", {
                    description: `Puan güncellendi: ${res.data.score ?? "Veri Yok"}`
                });
                queryClient.invalidateQueries({ queryKey: ["game"] });
            }
            else {
                toast.error("İşlem Başarısız", {
                    description: res?.data?.message || "Bilinmeyen bir sorun oluştu."
                });
            }
        },
        onError: () => {
            toast.error("Sunucu Hatası", { description: "Bağlantı kurulamadı." });
        }
    });

    return (
        <button
            onClick={() => mutate()}
            disabled={isPending}
            className="cursor-pointer flex items-center justify-center w-full h-full text-red-500 hover:text-red-400 transition-colors disabled:opacity-50"
            title="Metacritic Puanını Senkronize Et"
        >
            <RefreshCw
                size={20}
                className={isPending ? "animate-spin" : ""}
            />
        </button>
    );
};