import { Skeleton } from "@/core/components/ui/skeleton";

export default function ProfileLoading() {
    return (
        <div className="space-y-6 pb-10">
            <div className="flex items-start gap-6">
                <Skeleton className="h-24 w-24 rounded-full" />
                <div className="flex-1 space-y-3">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-72" />
                    <div className="flex gap-4">
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="h-5 w-20" />
                    </div>
                </div>
            </div>
            <div className="flex gap-2">
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-9 w-24 rounded-md" />
                ))}
            </div>
            <div className="space-y-4">
                {[1, 2, 3].map((item) => (
                    <Skeleton key={item} className="h-32 rounded-xl" />
                ))}
            </div>
        </div>
    );
}
