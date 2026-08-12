using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GGHub.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddIgdbRatingFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "IgdbCheckedAt",
                table: "Games",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "IgdbRating",
                table: "Games",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "IgdbRatingCount",
                table: "Games",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IgdbCheckedAt",
                table: "Games");

            migrationBuilder.DropColumn(
                name: "IgdbRating",
                table: "Games");

            migrationBuilder.DropColumn(
                name: "IgdbRatingCount",
                table: "Games");
        }
    }
}
