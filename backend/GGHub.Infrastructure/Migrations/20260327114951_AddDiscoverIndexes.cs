using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GGHub.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDiscoverIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // pg_trgm extension: ILIKE ve LIKE sorgularını GIN index ile hızlandırır.
            // Extension kurulumu transaction içinde çalışabilir.
            migrationBuilder.Sql(@"CREATE EXTENSION IF NOT EXISTS pg_trgm;");

            // GIN Trigram index — Name araması (AddGameToListModal ILIKE %search%)
            // suppressTransaction: CONCURRENTLY için zorunlu (transaction bloğunda çalışmaz)
            migrationBuilder.Sql(
                @"CREATE INDEX CONCURRENTLY IF NOT EXISTS ""IX_Games_Name_Trgm""
                  ON ""Games"" USING gin (""Name"" gin_trgm_ops);",
                suppressTransaction: true);

            // GIN Trigram index — Genre JSON LIKE filtresi (discover genre filtresi)
            migrationBuilder.Sql(
                @"CREATE INDEX CONCURRENTLY IF NOT EXISTS ""IX_Games_GenresJson_Trgm""
                  ON ""Games"" USING gin (""GenresJson"" gin_trgm_ops);",
                suppressTransaction: true);

            // GIN Trigram index — Platform JSON LIKE filtresi (discover platform filtresi)
            migrationBuilder.Sql(
                @"CREATE INDEX CONCURRENTLY IF NOT EXISTS ""IX_Games_PlatformsJson_Trgm""
                  ON ""Games"" USING gin (""PlatformsJson"" gin_trgm_ops);",
                suppressTransaction: true);

            // Partial B-tree index — Discover default feed sıralaması.
            // Sadece BackgroundImage olan (gösterilebilir) oyunları kapsar → daha küçük, daha hızlı.
            migrationBuilder.Sql(
                @"CREATE INDEX CONCURRENTLY IF NOT EXISTS ""IX_Games_DiscoverQuality""
                  ON ""Games"" (""Metacritic"" DESC NULLS LAST, ""Rating"" DESC NULLS LAST, ""RawgAdded"" DESC NULLS LAST)
                  WHERE ""BackgroundImage"" IS NOT NULL;",
                suppressTransaction: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"DROP INDEX IF EXISTS ""IX_Games_Name_Trgm"";");
            migrationBuilder.Sql(@"DROP INDEX IF EXISTS ""IX_Games_GenresJson_Trgm"";");
            migrationBuilder.Sql(@"DROP INDEX IF EXISTS ""IX_Games_PlatformsJson_Trgm"";");
            migrationBuilder.Sql(@"DROP INDEX IF EXISTS ""IX_Games_DiscoverQuality"";");
        }
    }
}
