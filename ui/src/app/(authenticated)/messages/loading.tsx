import { Skeleton } from "@/core/components/ui/skeleton";

export default function MessagesLoading() {
    return (
        <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-lg p-3">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                    </div>
                </div>
            ))}
        </div>
    );
}
