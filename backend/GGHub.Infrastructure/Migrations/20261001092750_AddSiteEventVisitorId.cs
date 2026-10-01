using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GGHub.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSiteEventVisitorId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "VisitorId",
                table: "SiteEvents",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_SiteEvents_Internal",
                table: "SiteEvents",
                columns: new[] { "SessionId", "VisitorId", "VisitorHash" },
                filter: "\"IsInternal\"");

            migrationBuilder.CreateIndex(
                name: "IX_SiteEvents_VisitorId",
                table: "SiteEvents",
                column: "VisitorId",
                filter: "\"VisitorId\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_SiteEvents_Internal",
                table: "SiteEvents");

            migrationBuilder.DropIndex(
                name: "IX_SiteEvents_VisitorId",
                table: "SiteEvents");

            migrationBuilder.DropColumn(
                name: "VisitorId",
                table: "SiteEvents");
        }
    }
}
