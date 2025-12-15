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

# Proje klasörüne git 
WORKDIR "/src/GGHub.WebAPI"
RUN dotnet build "GGHub.WebAPI.csproj" -c Release -o /app/build

# Publish
FROM build AS publish
RUN dotnet publish "GGHub.WebAPI.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:${PORT:-8080}

COPY --from=publish /app/publish .
ENTRYPOINT ["sh", "-c", "dotnet GGHub.WebAPI.dll --urls http://0.0.0.0:${PORT:-8080}"]