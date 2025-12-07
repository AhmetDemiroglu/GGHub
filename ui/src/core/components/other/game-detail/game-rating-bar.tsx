import { Smile, Meh, Frown, Trophy, CircleDashed } from "lucide-react";
import React from "react";

interface GameRatingBarProps {
    rating: number;
    onRateClick?: () => void;
    actionLabel?: string;
}

export const GameRatingBar = ({ rating, onRateClick, actionLabel = "Puan vermek için tıkla" }: GameRatingBarProps) => {
    const getRatingInfo = (score: number) => {
        if (score === 0) return {
            label: "Henüz Puan Yok",
            text: "text-zinc-400",
            icon: CircleDashed,
            gradient: "from-zinc-700 via-zinc-600 to-zinc-500 shadow-none"
        };

        if (score >= 9.0) return {
            label: "Olağanüstü",
            text: "text-emerald-400",
            icon: Trophy,
            gradient: "from-emerald-500 via-green-500 to-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)]"
        };

        if (score >= 7.0) return {
            label: "Öneriliyor",
            text: "text-blue-400",
            icon: Smile,
            gradient: "from-blue-600 via-blue-500 to-cyan-400 shadow-[0_0_20px_rgba(59,130,246,0.4)]"
        };

        if (score >= 5.0) return {
            label: "Ortalama",
            text: "text-yellow-400",
            icon: Meh,
            gradient: "from-orange-500 via-yellow-500 to-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)]"
        };

        return {
            label: "Zayıf",
            text: "text-red-400",
            icon: Frown,
            gradient: "from-red-600 via-red-500 to-orange-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]"
        };
    };

    const info = getRatingInfo(rating);
    const Icon = info.icon;
    const percentage = rating === 0 ? 0 : (rating / 10) * 100;

    return (
        <div className="w-full max-w-md group">
            {/* Üst Bilgi: Etiket ve Puan */}
            <div className="flex items-end justify-between mb-2 px-1">
                <div className="flex items-center gap-2">
                    <Icon size={24} className={`${info.text} drop-shadow-md`} />
                    <h3 className={`text-2xl font-black tracking-tight ${info.text} drop-shadow-sm`}>
                        {info.label}
                    </h3>
                </div>
                <div className="flex flex-col items-end leading-none">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">GGHub Puanı</span>
                    <span className={`text-xl font-bold ${info.text}`}>{rating.toFixed(1)}</span>
                </div>
            </div>

            {/* Renkli Bar Tasarımı */}
            <div
                onClick={onRateClick}
                className="h-6 w-full bg-zinc-900/80 rounded-full overflow-hidden relative shadow-inner border border-white/5 cursor-pointer hover:border-white/10 transition-all"
            >
                {/* Arka Plan Noise Deseni */}
                <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

                {/* Ana Puan Barı */}
                <div
                    className={`h-full bg-gradient-to-r ${info.gradient} transition-all duration-1000 ease-out relative`}
                    style={{ width: `${percentage}%` }}
                >
                    {/* Parlama Efekti */}
                    <div className="absolute top-0 right-0 bottom-0 w-px bg-white/50 shadow-[0_0_10px_#fff]" />
                </div>

                {/* Dekoratif Segment Çizgileri (RAWG tarzı) */}
                <div className="absolute inset-0 flex pointer-events-none">
                    <div className="w-[20%] border-r border-black/20 h-full"></div>
                    <div className="w-[30%] border-r border-black/20 h-full"></div>
                    <div className="w-[30%] border-r border-black/20 h-full"></div>
                </div>
            </div>

            {/* Alt Link (Call to Action) */}
            <div className="mt-3 flex justify-between items-center">
                <div
                    onClick={onRateClick}
                    className="text-xs font-medium text-zinc-500 group-hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                >
                    <span className="underline decoration-zinc-700 underline-offset-4 group-hover:decoration-white">
                        {actionLabel}
                    </span>
                </div>
                <span className="text-[10px] text-zinc-600">10 üzerinden</span>
            </div>
        </div>
    );
}; 