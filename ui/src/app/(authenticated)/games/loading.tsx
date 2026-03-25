import { Skeleton } from "@/core/components/ui/skeleton";

export default function GameLoading() {
    return (
        <div className="space-y-6 pb-10">
            <Skeleton className="h-[300px] w-full rounded-2xl" />
            <div className="space-y-4">
                <Skeleton className="h-10 w-72" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Skeleton className="h-48 rounded-xl" />
                <Skeleton className="h-48 rounded-xl" />
            </div>
        </div>
    );
}
