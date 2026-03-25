"use client";

import { Crown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/core/hooks/use-auth";
import { axiosInstance } from "@core/lib/axios";
import { cn } from "@/core/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/core/contexts/locale-context";

interface FavoriteButtonProps {
    gameId: number;
    className?: string;
}

export function FavoriteButton({ gameId, className }: FavoriteButtonProps) {
    const t = useI18n();
    const { isAuthenticated } = useAuth();
    const queryClient = useQueryClient();

    const { data: status, isLoading: isStatusLoading } = useQuery({
        queryKey: ["favorite-status", gameId],
        queryFn: async () => {
            const res = await axiosInstance.get<{ isFavorite: boolean }>(`/user-lists/favorites/${gameId}/status`);
            return res.data;
        },
        enabled: !!isAuthenticated,
    });

    const { mutate: toggleFav, isPending: isToggleLoading } = useMutation({
        mutationFn: async () => {
            const res = await axiosInstance.post<{ isAdded: boolean; message: string }>(`/user-lists/favorites/${gameId}`);
            return res.data;
        },
        onSuccess: (data) => {
            queryClient.setQueryData(["favorite-status", gameId], { isFavorite: data.isAdded });
            toast.success(data.message);
            queryClient.invalidateQueries({ queryKey: ["profile-lists"] });
        },
    });

    const isLoading = isStatusLoading || isToggleLoading;
    const isFavorite = status?.isFavorite ?? false;

    const handleClick = () => {
        if (!isAuthenticated) {
            toast.error(t("favoriteButton.loginRequired"));
            return;
        }

        toggleFav();
    };

    return (
        <button
            onClick={handleClick}
            disabled={isLoading}
            className={cn(
                "flex items-center justify-center w-14 rounded-xl transition-all cursor-pointer backdrop-blur-md border",
                "py-3.5",
                isFavorite
                    ? "bg-yellow-500/20 text-yellow-500 border-yellow-500/50 hover:bg-yellow-500/30"
                    : "bg-white/5 text-white border-white/10 hover:bg-white/10 hover:border-white/20",
                className
            )}
            title={isFavorite ? t("favoriteButton.removeTitle") : t("favoriteButton.addTitle")}
        >
            {isLoading ? (
                <Loader2 size={20} className="animate-spin" />
            ) : (
                <Crown size={20} className={cn(isFavorite && "fill-current")} />
            )}
        </button>
    );
}
