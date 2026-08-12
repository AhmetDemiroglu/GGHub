import { Badge } from "@core/components/ui/badge";
import { cn } from "@core/lib/utils";

type ScoreType = 'metacritic' | 'rawg' | 'gghub' | 'igdb';

interface ScoreBadgeProps {
  type: ScoreType;
  score: number | string | null | undefined;
}

const getScoreStyling = (type: ScoreType, score: number | null | undefined) => {
  if (type === 'gghub') {
    return "bg-purple-500/10 text-purple-400 border-purple-500/20";
  }
  if (type === 'rawg') {
    return "bg-blue-500/10 text-blue-400 border-blue-500/20";
  }
  if (type === 'igdb') {
    return "bg-indigo-500/10 text-indigo-300 border-indigo-500/20";
  }

  if (!score) return "bg-gray-500/10 text-gray-400 border-gray-500/20";
  if (score > 74) return "bg-green-500/10 text-green-400 border-green-500/20 shadow-[0_0_8px_rgba(34,197,94,0.3)]";
  if (score > 49) return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20 shadow-[0_0_8px_rgba(234,179,8,0.3)]";
  return "bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.3)]";
};

export function ScoreBadge({ type, score }: ScoreBadgeProps) {
  // IGDB puanı 0-100 aralığında gelir (Metacritic gibi tam sayı gösterilir),
  // RAWG ve GGHub 0-5 / 0-10 aralığında ondalıklı.
  const scoreValue =
    typeof score === "number"
      ? type === "rawg" || type === "gghub"
        ? score.toFixed(1)
        : Math.round(score)
      : score;

  return (
    <div>
      <p className="text-xs text-muted-foreground capitalize mb-2">{type}</p>
      <Badge variant="outline" className={cn("text-lg font-bold", getScoreStyling(type, typeof score === 'number' ? score : null))}>
        {scoreValue ?? '-'}
      </Badge>
    </div>
  );
}