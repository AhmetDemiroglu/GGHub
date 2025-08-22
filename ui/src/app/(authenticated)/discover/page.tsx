"use client";

import { useState, useEffect } from "react";
import { gameApi } from "@/api/gaming/game.api";
import { GameCard } from "@core/components/other/game-card";
import { useQuery } from "@tanstack/react-query";
import { DataPagination } from "@core/components/other/data-pagination";
import { DateFilter } from "@core/components/other/date-filter";
import { Input } from "@core/components/ui/input";
import { useDebounce } from "@core/hooks/use-debounce";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@core/components/ui/select";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@core/components/ui/dropdown-menu";
import { Button } from "@core/components/ui/button";


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
  { value: "-added", label: "Popülerliğe Göre" },
  { value: "-rating", label: "Puana Göre (RAWG)" },
  { value: "-metacritic", label: "Puana Göre (Metacritic)" },
  { value: "name", label: "Ada Göre (A-Z)" },
  { value: "-name", label: "Ada Göre (Z-A)" },
  { value: "-released", label: "Çıkış Tarihi (Yeni)" },
  { value: "released", label: "Çıkış Tarihi (Eski)" },
];

export default function DiscoverPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [searchTerm, setSearchTerm] = useState("");
  const [ordering, setOrdering] = useState("-added");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const { data, isLoading, error } = useQuery({
    queryKey: ['games-discover', page, pageSize, debouncedSearchTerm, ordering, selectedGenres, selectedPlatforms, dateRange], 
    queryFn: () => gameApi.paginate(page, pageSize, debouncedSearchTerm, ordering, selectedGenres.join(','), selectedPlatforms.join(','), dateRange),
  });

  useEffect(() => {
    setPage(1);
  }, [debouncedSearchTerm, ordering, selectedGenres, selectedPlatforms, dateRange]);

  const clearFilters = () => {
    setSelectedGenres([]);
    setSelectedPlatforms([]);
    setSearchTerm("");
    setOrdering("-added");
    setPage(1);
    setDateRange("");
  };

  if (error) return <div>Bir hata oluştu: {error.message}</div>;

  return (
    <div className="w-full p-5">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Keşfet</h1>
          <p className="text-muted-foreground mt-2">
            Popüler ve yeni çıkan oyunları burada keşfet.
          </p>
        </div>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <Input 
            placeholder="Oyun ara..." 
            className="w-full sm:max-w-xs"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <Button variant="outline">Türler ({selectedGenres.length})</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                  <DropdownMenuLabel>Oyun Türü Seç</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {genreOptions.map(option => (
                      <DropdownMenuCheckboxItem
                          key={option.value}
                          checked={selectedGenres.includes(option.value)}
                          onCheckedChange={() => {
                              const newSelection = selectedGenres.includes(option.value)
                                  ? selectedGenres.filter(g => g !== option.value)
                                  : [...selectedGenres, option.value];
                              setSelectedGenres(newSelection);
                          }}
                      >
                          {option.label}
                      </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <Button variant="outline">Platformlar ({selectedPlatforms.length})</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                  <DropdownMenuLabel>Platform Seç</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {platformOptions.map(option => (
                      <DropdownMenuCheckboxItem
                          key={option.value}
                          checked={selectedPlatforms.includes(option.value)}
                          onCheckedChange={() => {
                              const newSelection = selectedPlatforms.includes(option.value)
                                  ? selectedPlatforms.filter(p => p !== option.value)
                                  : [...selectedPlatforms, option.value];
                              setSelectedPlatforms(newSelection);
                          }}
                      >
                          {option.label}
                      </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
          </DropdownMenu>

          <DateFilter value={dateRange} onValueChange={setDateRange} />

          <Select value={ordering} onValueChange={setOrdering}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Sırala" />
            </SelectTrigger>
            <SelectContent>
              <DropdownMenuLabel>Sırala</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {orderingOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" onClick={clearFilters}>
            Filtreleri Temizle
          </Button>
        </div>
      </div>

      {isLoading && <div>Yükleniyor...</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {data?.items.map((game) => (
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