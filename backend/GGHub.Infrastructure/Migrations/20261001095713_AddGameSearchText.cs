using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GGHub.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddGameSearchText : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SearchText",
                table: "Games",
                type: "text",
                nullable: true);

            // Trigram indeksi: kelime basi LIKE ('% gta%') ve yazim hatasi toleransi (<%) icin.
            // Eklenti kurulamazsa migration DUSMEZ (acilistaki Migrate() API'yi kapatirdi);
            // arama indekssiz de calisir, yalniz yazim hatasi kademesi bos doner.
            migrationBuilder.Sql(@"
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_trgm kurulamadi: %', SQLERRM;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
        CREATE INDEX IF NOT EXISTS ""IX_Games_SearchText_Trgm"" ON ""Games"" USING gin (""SearchText"" gin_trgm_ops);
    END IF;
END $$;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"DROP INDEX IF EXISTS ""IX_Games_SearchText_Trgm"";");

            migrationBuilder.DropColumn(
                name: "SearchText",
                table: "Games");
        }
    }
}
