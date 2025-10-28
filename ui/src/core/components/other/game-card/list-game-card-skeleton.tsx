import { Skeleton } from "@/core/components/ui/skeleton";

export function ListGameCardSkeleton() {
    return (
        <div className="flex gap-3 p-3 rounded-lg border bg-card">
            {/* Sol: Thumbnail Skeleton */}
            <Skeleton className="w-20 h-20 rounded flex-shrink-0" />

            {/* Orta: Bilgiler Skeleton */}
            <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                    {/* Başlık skeleton */}
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4 mb-2" />

                    {/* Yıl skeleton */}
                    <Skeleton className="h-3 w-12" />
                </div>

                {/* Alt: Badge'ler skeleton */}
                <div className="flex items-center gap-2 mt-2">
                    <Skeleton className="h-6 w-12 rounded-md" />
                    <Skeleton className="h-6 w-10 rounded-md" />
                </div>
            </div>

            {/* Sağ: Trash button skeleton */}
            <Skeleton className="w-8 h-8 rounded-md flex-shrink-0" />
        </div>
    );
}
