using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GGHub.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddGameHypeScore : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "HypeScore",
                table: "Games",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<DateTime>(
                name: "HypeScoreUpdatedAt",
                table: "Games",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WikipediaTitle",
                table: "Games",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "WikipediaViews30d",
                table: "Games",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "WikipediaViewsUpdatedAt",
                table: "Games",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "HypeScore",
                table: "Games");

            migrationBuilder.DropColumn(
                name: "HypeScoreUpdatedAt",
                table: "Games");

            migrationBuilder.DropColumn(
                name: "WikipediaTitle",
                table: "Games");

            migrationBuilder.DropColumn(
                name: "WikipediaViews30d",
                table: "Games");

            migrationBuilder.DropColumn(
                name: "WikipediaViewsUpdatedAt",
                table: "Games");
        }
    }
}
