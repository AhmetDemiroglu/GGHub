"use client";

import { Button } from "@core/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuPortal, DropdownMenuSubContent } from "@core/components/ui/dropdown-menu";

interface DateFilterProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

const currentYear = new Date().getFullYear();
const decades = Array.from({ length: Math.ceil((currentYear - 1980) / 10) + 1 }, (_, i) => {
  const start = currentYear - (currentYear % 10) - (i * 10);
  return start;
});

const fmt = (d: Date) => d.toISOString().slice(0, 10);
const addMonths = (d: Date, m: number) => { const x = new Date(d); x.setMonth(x.getMonth() + m); return x; };

export function DateFilter({ value, onValueChange, className }: DateFilterProps) {
  const getLabel = () => {
    if (!value) return "Çıkış Yılı";

    const [startStr = "", endStr = ""] = value.split(",");
    const startYear = parseInt(startStr.slice(0, 4));
    const endYear   = parseInt(endStr.slice(0, 4));

    const today = new Date();
    const futureValue = `${fmt(today)},${fmt(addMonths(today, 24))}`;
    if (value === futureValue) return "Gelecek Oyunlar";

    if (!Number.isNaN(startYear) && !Number.isNaN(endYear)) {
      if (endYear - startYear === 9 && startStr.endsWith("-01-01") && endStr.endsWith("-12-31")) {
        return `${startYear}'lar`;
      }
    }

    return startStr.slice(0, 4);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={className}>{getLabel()}</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
          <DropdownMenuRadioItem value="">Tüm Zamanlar</DropdownMenuRadioItem>
            {(() => {
              const today = new Date();
              const start = fmt(today);
              const end = fmt(addMonths(today, 24));
              const futureValue = `${start},${end}`;
              return (
                <DropdownMenuRadioItem value={futureValue}>
                  Gelecek Oyunlar
                </DropdownMenuRadioItem>
              );
            })()}
          <DropdownMenuSeparator />

          {decades.map(decadeStart => {
            const decadeEnd = decadeStart + 9;
            return (
              <DropdownMenuSub key={decadeStart}>
                <DropdownMenuSubTrigger>{decadeStart} - {decadeEnd}</DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
                        <DropdownMenuRadioItem value={`${decadeStart}-01-01,${decadeEnd}-12-31`}>Tümü ({decadeStart}'lar)</DropdownMenuRadioItem>
                        <DropdownMenuSeparator/>
                        {Array.from({length: 10}, (_, i) => decadeEnd - i).map(year => (
                            <DropdownMenuRadioItem key={year} value={`${year}-01-01,${year}-12-31`}>
                                {year}
                            </DropdownMenuRadioItem>
                        ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
            )
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}