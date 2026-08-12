/**
 * IGDB rozet simgesi. Diğer kaynaklar (RAWG, Metacritic, GGHub) PNG asset kullanıyor;
 * IGDB için elimizde bir PNG olmadığından SVG olarak çizildi. Böylece hem web hem mobil
 * aynı görseli üretir ve dosya boyutu sıfırdır. Gerçek marka logosu eklenmek istenirse
 * ui/src/core/assets/igdb_logo.png konup burası Image ile değiştirilebilir.
 */
export function IgdbLogo({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
            <rect width="24" height="24" rx="6" fill="#2c3b8f" />
            <rect x="3.5" y="6" width="3" height="12" rx="1.5" fill="#ffffff" />
            <path
                d="M10 6.5h5.2c3.3 0 5.6 2.2 5.6 5.5s-2.3 5.5-5.6 5.5H10V6.5zm3.2 2.8v5.4h1.8c1.6 0 2.6-1 2.6-2.7s-1-2.7-2.6-2.7h-1.8z"
                fill="#ffffff"
            />
        </svg>
    );
}
