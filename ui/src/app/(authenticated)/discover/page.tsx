"use client";

import { useState, useEffect } from "react";
import { gameApi } from "@/api/gaming/game.api";
import { GameCard } from "@core/components/other/game-card";
import { useQuery } from "@tanstack/react-query";
import { DataPagination } from "@core/components/other/data-pagination";
import { DateFilter } from "@core/components/other/date-filter";
import { Input } from "@core/components/ui/input";
import { useDebounce } from "@core/hooks/use-debounce";
import { Select, SelectGroup, SelectContent, SelectLabel, SelectSeparator, SelectItem, SelectTrigger, SelectValue } from "@core/components/ui/select";


const genreOptions = [
  { value: "4", label: "Action" },
  { value: "51", label: "Indie" },
  { value: "3", label: "Adventure" },
  { value: "5", label: "RPG" },
  { value: "10", label: "Strategy" },
  { value: "2", label: "Shooter" },
  { value: "7", label: "Puzzle" },
  { value: "11", label: "Arcade" },
  { value: "83", label: "Platformer" },
  { value: "1", label: "Racing" },
  { value: "59", label: "Massively Multiplayer" },
  { value: "15", label: "Sports" },
  { value: "6", label: "Fighting" },
  { value: "14", label: "Simulation" },
];

const platformOptions = [
  { value: "4", label: "PC" },
  { value: "187", label: "PlayStation" },
  { value: "186", label: "Xbox" },
  { value: "7", label: "Nintendo" },
  { value: "3", label: "iOS" },
  { value: "21", label: "Android" },
  { value: "5", label: "macOS" },
  { value: "6", label: "Linux" },
  { value: "107", label: "SEGA" },
  { value: "28", label: "Atari" },
  { value: "171", label: "Web" },
];

const orderingOptions = [
  { value: "-added", label: "Popülerlik" },
  { value: "-metacritic", label: "Metacritic Puanı" },
  { value: "-released", label: "Çıkış Tarihi" },
  { value: "name", label: "Oyun Adı" }
];

export default function DiscoverPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [searchTerm, setSearchTerm] = useState("");
  const [ordering, setOrdering] = useState("-added");
  const [selectedGenre, setSelectedGenre] = useState<string>("");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("");
  const [dateRange, setDateRange] = useState("");
  const [isGenreMenuOpen, setGenreMenuOpen] = useState(false);
  const [isPlatformMenuOpen, setPlatformMenuOpen] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const { data, isLoading, error } = useQuery({
    queryKey: ['games-discover', page, pageSize, debouncedSearchTerm, ordering, selectedGenre ?? "", selectedPlatform ?? "", dateRange],
    queryFn: () => gameApi.paginate(
      page,
      pageSize,
      debouncedSearchTerm,
      ordering,
      selectedGenre ?? "",     
      selectedPlatform ?? "",
      dateRange
    ),
  });

  useEffect(() => {
    setPage(1);
  }, [debouncedSearchTerm, ordering, selectedGenre, selectedPlatform, dateRange]);

  const normalizeName = (s: string) => s?.trim() ?? "";
  const startsWithLetterOrDigit = (s: string) => /^[\p{L}\p{N}]/u.test(s);

  const nameComparator = (a: string, b: string) => {
    const aNorm = normalizeName(a);
    const bNorm = normalizeName(b);
    const aGood = startsWithLetterOrDigit(aNorm);
    const bGood = startsWithLetterOrDigit(bNorm);

    if (aGood && !bGood) return -1;
    if (!aGood && bGood) return 1;

    return aNorm.localeCompare(bNorm, 'tr', { sensitivity: 'base' });
  };

  const items = data?.items ?? [];
  const visibleItems = ordering === 'name'
    ? [...items].sort((a, b) => nameComparator(a.name, b.name))
    : items;

  if (error) return <div>Bir hata oluştu: {error.message}</div>;

  return (
    <div className="w-full p-5">
      <div className="space-y-4">
        {/* Başlık */}
        <div>
          <h1 className="text-3xl font-bold">Keşfet</h1>
          <p className="text-muted-foreground mt-2">
            Popüler ve yeni çıkan oyunları burada keşfet.
          </p>
        </div>

        {/* Arama, Filtre ve Sıralama Barı */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-5">
          {/* Sol Taraf: Arama */}
          <Input 
            placeholder="Oyun ara..." 
            className="w-full sm:max-w-xs"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          {/* Sağ Taraf: Filtreler ve Sıralama */}
          <div className="flex flex-wrap items-center gap-2">
              <Select open={isGenreMenuOpen} onOpenChange={setGenreMenuOpen} value={selectedGenre || ''} onValueChange={setSelectedGenre}>
                <SelectTrigger className="w-full sm:w-auto cursor-pointer"><SelectValue placeholder="Tür" /></SelectTrigger>
                <SelectContent>
                    <div
                      onClick={() => { setSelectedGenre(""); setGenreMenuOpen(false); }}
                      className="relative flex w-full cursor-pointer items-center rounded-sm py-1.5 pl-8 pr-2 text-sm text-red-500 outline-none focus:bg-accent"
                    >
                      Temizle
                    </div>
                  <SelectSeparator />
                    {genreOptions.map(g => (
                      <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                    ))}
                </SelectContent>
              </Select>

              <Select open={isPlatformMenuOpen} onOpenChange={setPlatformMenuOpen} value={selectedPlatform || ''} onValueChange={setSelectedPlatform}>
                <SelectTrigger className="w-full sm:w-auto cursor-pointer"><SelectValue placeholder="Platform" /></SelectTrigger>
                <SelectContent>
                    <div
                      onClick={() => { setSelectedPlatform(""); setPlatformMenuOpen(false); }}
                      className="relative flex w-full cursor-pointer items-center rounded-sm py-1.5 pl-8 pr-2 text-sm text-red-500 outline-none focus:bg-accent"
                    >
                      Temizle
                    </div>
                  <SelectSeparator />
                    {platformOptions.map(p => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                </SelectContent>
              </Select>

              <DateFilter value={dateRange} onValueChange={setDateRange} />

              <Select value={ordering} onValueChange={setOrdering}>
                <SelectTrigger className="w-full sm:w-auto cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Sıralama Kriteri</SelectLabel>
                    <SelectSeparator />
                      {orderingOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
          </div>
        </div>
      </div>
    
      {isLoading && <div>Yükleniyor...</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {visibleItems.map((game) => (
          <GameCard key={game.rawgId} game={game} />
        ))}
      </div>
      
      {data && data.totalCount > 0 && (
        <div className="mt-8">
          <DataPagination 
            page={page}
            pageSize={pageSize}
            totalCount={data.totalCount}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}