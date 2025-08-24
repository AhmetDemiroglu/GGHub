"use client";

import { useState, useEffect } from "react";
import { gameApi } from "@/api/gaming/game.api";
import { GameCard } from "@core/components/other/game-card";
import { useQuery } from "@tanstack/react-query";
import { DataPagination } from "@core/components/other/data-pagination";
import { Input } from "@core/components/ui/input";
import { useDebounce } from "@core/hooks/use-debounce";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@core/components/ui/select";

const orderingOptions = [
  { value: "-added", label: "Popülerliğe Göre" },
  { value: "-metacritic", label: "Metacritic Puanı" },
  { value: "name", label: "İsme Göre" },
  { value: "-released", label: "Çıkış Tarihine Göre" },
];

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

export default function DiscoverPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [searchTerm, setSearchTerm] = useState("");
  const [ordering, setOrdering] = useState("-added");
  
  // Artık tek bir değer tutacaklar (çoklu seçim iptal)
  const [selectedGenre, setSelectedGenre] = useState<string>("");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("");

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearchTerm, ordering, selectedGenre, selectedPlatform]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['games-discover', page, pageSize, debouncedSearchTerm, ordering, selectedGenre, selectedPlatform], 
    queryFn: () => gameApi.paginate(page, pageSize, debouncedSearchTerm, ordering, selectedGenre, selectedPlatform),
  });

  if (error) return <div>Bir hata oluştu: {error.message}</div>;

  return (
    <div className="w-full p-5">
      {/* Başlık alanı */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Keşfet</h1>
          <p className="text-muted-foreground mt-2">Popüler ve yeni çıkan oyunları burada keşfet.</p>
        </div>
        <Input 
          placeholder="Oyun ara..." 
          className="w-full sm:max-w-xs"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Filtreleme ve Sıralama Barı */}
      <div className="flex flex-wrap items-center gap-4 mb-8">
        {/* TÜR FİLTRESİ */}
        <Select
          value={selectedGenre}
          onValueChange={(value) =>
            setSelectedGenre(value === "all" ? "" : value)
          }
        >
          <SelectTrigger className="w-[180px] cursor-pointer">
            <SelectValue placeholder="Türe Göre Filtrele" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tümü (Temizle)</SelectItem>
            {genreOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* PLATFORM FİLTRESİ */}
        <Select
          value={selectedPlatform}
          onValueChange={(value) =>
            setSelectedPlatform(value === "all" ? "" : value)
          }
        >
          <SelectTrigger className="w-[180px] cursor-pointer">
            <SelectValue placeholder="Platforma Göre Filtrele" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tümü (Temizle)</SelectItem>
            {platformOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* SIRALAMA */}
        <Select value={ordering} onValueChange={setOrdering}>
          <SelectTrigger className="w-[180px] cursor-pointer">
            <SelectValue placeholder="Sırala" />
          </SelectTrigger>
          <SelectContent>
            {orderingOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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