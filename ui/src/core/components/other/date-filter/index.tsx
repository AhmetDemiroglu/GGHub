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

export function DateFilter({ value, onValueChange, className }: DateFilterProps) {
  const getLabel = () => {
    if (!value) return "Çıkış Yılı";
    if (value.startsWith(String(currentYear))) return "Gelecek Oyunlar";
    const year = value.substring(0, 4);
    if(value.includes(',')) {
        const endYear = value.substring(9, 13);
        if(parseInt(endYear) - parseInt(year) === 9) return `${year}'lar`;
    }
    return year;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={className}>{getLabel()}</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
          <DropdownMenuRadioItem value="">Tüm Zamanlar</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value={`${currentYear + 1}-01-01,${currentYear + 10}-12-31`}>
            Gelecek Oyunlar
          </DropdownMenuRadioItem>
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