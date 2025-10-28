import { Skeleton } from "@/core/components/ui/skeleton";
import { Separator } from "@/core/components/ui/separator";

export function ListCardSkeleton() {
    return (
        <div className="bg-card rounded-lg overflow-hidden h-full flex flex-col border border-border">
            <Skeleton className="w-full aspect-video" />
            <div className="p-4 flex flex-col flex-1">
                {/* Başlık Skeleton */}
                <Skeleton className="h-6 w-3/4 mb-4" />

                {/* Rozetler Skeleton */}
                <div className="flex flex-col items-start gap-2 mb-4">
                    <Skeleton className="h-6 w-24" />
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-6 w-20" />
                        <Skeleton className="h-6 w-16" />
                    </div>
                </div>

                <Separator className="bg-border" />

                {/* İstatistikler Skeleton */}
                <div className="flex justify-between items-center pt-3 mt-auto">
                    <Skeleton className="h-5 w-12" />
                    <Skeleton className="h-5 w-12" />
                </div>
            </div>
        </div>
    );
}
