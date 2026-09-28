using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GGHub.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AppReleasePolicy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AppReleasePolicies",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false),
                    MaintenanceEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    MaintenanceMessageTr = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    MaintenanceMessageEn = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    IosMinVersion = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    IosRecommendedVersion = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    AndroidMinVersion = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    AndroidRecommendedVersion = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    IosStoreUrl = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    AndroidStoreUrl = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppReleasePolicies", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AppReleasePolicies");
        }
    }
}
