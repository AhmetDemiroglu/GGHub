using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace GGHub.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSiteEvents : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SiteEvents",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    EventType = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    SessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    OccurredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UserId = table.Column<int>(type: "integer", nullable: true),
                    IsInternal = table.Column<bool>(type: "boolean", nullable: false),
                    Route = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    PathKey = table.Column<string>(type: "character varying(96)", maxLength: 96, nullable: true),
                    ActionName = table.Column<string>(type: "character varying(48)", maxLength: 48, nullable: true),
                    Locale = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: true),
                    Platform = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: true),
                    DeviceType = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: true),
                    Browser = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    IsBot = table.Column<bool>(type: "boolean", nullable: false),
                    UtmSource = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    UtmMedium = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    UtmCampaign = table.Column<string>(type: "character varying(96)", maxLength: 96, nullable: true),
                    ClickIdSource = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: true),
                    ReferrerHost = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    CountryCode = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: true),
                    Language = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: true),
                    VisitorHash = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    DwellMs = table.Column<int>(type: "integer", nullable: true),
                    ScrollDepth = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SiteEvents", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SiteEvents_OccurredAt_EventType",
                table: "SiteEvents",
                columns: new[] { "OccurredAt", "EventType" });

            migrationBuilder.CreateIndex(
                name: "IX_SiteEvents_SessionId",
                table: "SiteEvents",
                column: "SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_SiteEvents_UserId_OccurredAt",
                table: "SiteEvents",
                columns: new[] { "UserId", "OccurredAt" },
                filter: "\"UserId\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SiteEvents");
        }
    }
}
