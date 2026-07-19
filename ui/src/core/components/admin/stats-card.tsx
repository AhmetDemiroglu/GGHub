"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card";

interface StatsCardProps {
    title: string;
    value: string | number;
    icon: React.ElementType;
    /** Opsiyonel alt satır; mevcut çağrıları etkilemez. */
    description?: string;
}

export const StatsCard = ({ title, value, icon: Icon, description }: StatsCardProps) => {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
            </CardContent>
        </Card>
    );
};
