"use client";

import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import { GenreStat } from "@/models/stats/user-stats.model";
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card";
import { Dna, Share2 } from "lucide-react";
import { Button } from "@/core/components/ui/button";
import { toast } from "sonner";

interface GamerDNAChartProps {
    data: GenreStat[];
    username?: string;
}

export default function GamerDNAChart({ data, username }: GamerDNAChartProps) {
    const handleShare = () => {
        const url = window.location.href;
        const displayName = username || "Kullanıcı";
        navigator.clipboard.writeText(`🎮 ${displayName} adlı oyuncunun Gamer DNA'sına bak: ${url}`);
        toast.success("Profil linki kopyalandı!");
    };

    if (!data || data.length < 3) {
        return (
            <Card className="h-full border-border/50 bg-card/50">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                        <Dna className="h-4 w-4" /> Gamer DNA
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-[200px] text-xs text-muted-foreground text-center px-4">
                    Yeterli veri yok. İnceleme yaparak veya listeler oluşturarak DNA'nızı oluşturun.
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="h-full border-border/50 bg-card shadow-sm overflow-hidden flex flex-col">
            <CardHeader className="pb-0 pt-0 px-3 flex flex-row items-center justify-between shrink-0 space-y-0">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <div className="p-1.5 bg-primary/10 rounded-md">
                        <Dna className="h-4 w-4 text-primary" />
                    </div>
                    Gamer DNA
                </CardTitle>

                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary cursor-pointer" onClick={handleShare} title="DNA'nı Paylaş">
                    <Share2 className="h-3.5 w-3.5" />
                </Button>
            </CardHeader>

            <CardContent className="p-0 flex-1 w-full relative min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="85%" data={data}>
                        <PolarGrid stroke="currentColor" className="text-muted-foreground/20" />

                        <PolarAngleAxis
                            dataKey="name"
                            tick={({ payload, x, y, textAnchor, stroke, radius }) => (
                                <text
                                    x={x}
                                    y={y}
                                    textAnchor={textAnchor}
                                    stroke="none"
                                    fill="currentColor"
                                    className="text-[10px] font-bold fill-muted-foreground uppercase tracking-widest"
                                    dy={2}
                                >
                                    {payload.value}
                                </text>
                            )}
                        />

                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />

                        <Radar
                            name="Etkileşim"
                            dataKey="percentage"
                            className="fill-primary/50 stroke-primary"
                            strokeWidth={2.5}
                            isAnimationActive={true}
                        />

                        <Tooltip
                            contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                borderColor: "hsl(var(--border))",
                                borderRadius: "6px",
                                fontSize: "11px",
                                padding: "4px 8px",
                                color: "hsl(var(--foreground))"
                            }}
                            itemStyle={{ color: "hsl(var(--primary))", fontWeight: "bold" }}
                            formatter={(value: number) => [`%${value}`, "Oran"]}
                        />
                    </RadarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}