using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace GGHub.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDownloadPageEvents : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DownloadPageEvents",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    EventType = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false),
                    VisitId = table.Column<Guid>(type: "uuid", nullable: false),
                    OccurredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Platform = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: true),
                    DeviceType = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: true),
                    Browser = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    UtmSource = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    UtmMedium = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    UtmCampaign = table.Column<string>(type: "character varying(96)", maxLength: 96, nullable: true),
                    UtmContent = table.Column<string>(type: "character varying(96)", maxLength: 96, nullable: true),
                    UtmTerm = table.Column<string>(type: "character varying(96)", maxLength: 96, nullable: true),
                    ClickIdSource = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: true),
                    ReferrerHost = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    CountryCode = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: true),
                    Language = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: true),
                    Target = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: true),
                    DwellMs = table.Column<int>(type: "integer", nullable: true),
                    SecondsLeft = table.Column<int>(type: "integer", nullable: true),
                    VisitorHash = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    IsBot = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DownloadPageEvents", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DownloadPageEvents_OccurredAt_EventType",
                table: "DownloadPageEvents",
                columns: new[] { "OccurredAt", "EventType" });

            migrationBuilder.CreateIndex(
                name: "IX_DownloadPageEvents_UtmCampaign_OccurredAt",
                table: "DownloadPageEvents",
                columns: new[] { "UtmCampaign", "OccurredAt" });

            migrationBuilder.CreateIndex(
                name: "IX_DownloadPageEvents_VisitId",
                table: "DownloadPageEvents",
                column: "VisitId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DownloadPageEvents");
        }
    }
}
