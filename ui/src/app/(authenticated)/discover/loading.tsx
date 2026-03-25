import { Skeleton } from "@/core/components/ui/skeleton";

export default function DiscoverLoading() {
    return (
        <div className="space-y-6 pb-10">
            <Skeleton className="h-10 w-64 rounded-lg" />
            <div className="flex gap-2">
                {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-9 w-24 rounded-md" />
                ))}
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((item) => (
                    <Skeleton key={item} className="aspect-[3/4] rounded-xl" />
                ))}
            </div>
        </div>
    );
}
