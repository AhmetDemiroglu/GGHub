import { Skeleton } from "@core/components/ui/skeleton";

export function GameCardSkeleton() {
  return (
    <div className="bg-muted/20 rounded-lg overflow-hidden h-full flex flex-col">
      {/* Resim Alanı için İskelet */}
      <Skeleton className="aspect-video w-full" />

      <div className="p-4 flex flex-col flex-1">
        {/* Platform İkonları için İskelet */}
        <div className="mb-2 h-4 flex gap-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-4 rounded-full" />
        </div>
        
        {/* Başlık için İskelet */}
        <Skeleton className="h-6 w-3/4 mb-4" />

        {/* Puanlar için İskelet */}
        <div className="grid grid-cols-3 gap-4 text-center mb-4">
            <div className="space-y-1"><Skeleton className="h-2 w-10 mx-auto"/><Skeleton className="h-6 w-8 mx-auto"/></div>
            <div className="space-y-1"><Skeleton className="h-2 w-10 mx-auto"/><Skeleton className="h-6 w-8 mx-auto"/></div>
            <div className="space-y-1"><Skeleton className="h-2 w-10 mx-auto"/><Skeleton className="h-6 w-8 mx-auto"/></div>
        </div>

        {/* Çıkış Tarihi ve Türler için İskelet */}
        <div className="flex justify-between items-center border-t border-white/10 pt-3 mt-auto">
            <div className="space-y-1"><Skeleton className="h-2 w-12"/><Skeleton className="h-4 w-20"/></div>
            <div className="space-y-1 text-right"><Skeleton className="h-2 w-8 ml-auto"/><Skeleton className="h-4 w-24"/></div>
        </div>
      </div>
    </div>
  );
}