# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# DEĞİŞİKLİK: Tüm kaynak .csproj yollarının başına 'backend/' eklendi.
# Hedef yollar aynı kalıyor.
COPY ["backend/GGHub.WebAPI/GGHub.WebAPI.csproj", "GGHub.WebAPI/"]
COPY ["backend/GGHub.Infrastructure/GGHub.Infrastructure.csproj", "GGHub.Infrastructure/"]
COPY ["backend/GGHub.Application/GGHub.Application.csproj", "GGHub.Application/"]
COPY ["backend/GGHub.Core/GGHub.Core.csproj", "GGHub.Core/"]

# Restore komutu, kopyaladığımız hedef yola göre çalışıyor (Bu satır doğruydu)
RUN dotnet restore "GGHub.WebAPI/GGHub.WebAPI.csproj"

# DEĞİŞİKLİK: Kök dizindeki her şeyi değil, SADECE 'backend/' klasörünün İÇERİĞİNİ kopyala
COPY backend/ .

# Proje klasörüne git (Bu satır artık doğru çalışacak)
WORKDIR "/src/GGHub.WebAPI"
RUN dotnet build "GGHub.WebAPI.csproj" -c Release -o /app/build

# Publish
FROM build AS publish
RUN dotnet publish "GGHub.WebAPI.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# YENİ SATIR: Kestrel'e Railway'in verdiği $PORT'u dinlemesini söylüyoruz
ENV ASPNETCORE_URLS=http://*:$PORT

COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "GGHub.WebAPI.dll"]