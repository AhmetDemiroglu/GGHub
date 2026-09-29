using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace GGHub.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddGameTagsForSimilarGames : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "IgdbSimilarJson",
                table: "Games",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "TagsSyncedAt",
                table: "Games",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "GameTags",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    GameId = table.Column<int>(type: "integer", nullable: false),
                    Slug = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Name = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    Source = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GameTags", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GameTags_Games_GameId",
                        column: x => x.GameId,
                        principalTable: "Games",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Games_TagSyncQueue",
                table: "Games",
                columns: new[] { "TagsSyncedAt", "RawgAdded" },
                filter: "\"IgdbId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_GameTags_GameId_Slug",
                table: "GameTags",
                columns: new[] { "GameId", "Slug" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_GameTags_Slug",
                table: "GameTags",
                column: "Slug");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "GameTags");

            migrationBuilder.DropIndex(
                name: "IX_Games_TagSyncQueue",
                table: "Games");

            migrationBuilder.DropColumn(
                name: "IgdbSimilarJson",
                table: "Games");

            migrationBuilder.DropColumn(
                name: "TagsSyncedAt",
                table: "Games");
        }
    }
}
