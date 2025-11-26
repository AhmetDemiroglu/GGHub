using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GGHub.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDetailsToGame : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DevelopersJson",
                table: "Games",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EsrbRating",
                table: "Games",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GenresJson",
                table: "Games",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PlatformsJson",
                table: "Games",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PublishersJson",
                table: "Games",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StoresJson",
                table: "Games",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WebsiteUrl",
                table: "Games",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DevelopersJson",
                table: "Games");

            migrationBuilder.DropColumn(
                name: "EsrbRating",
                table: "Games");

            migrationBuilder.DropColumn(
                name: "GenresJson",
                table: "Games");

            migrationBuilder.DropColumn(
                name: "PlatformsJson",
                table: "Games");

            migrationBuilder.DropColumn(
                name: "PublishersJson",
                table: "Games");

            migrationBuilder.DropColumn(
                name: "StoresJson",
                table: "Games");

            migrationBuilder.DropColumn(
                name: "WebsiteUrl",
                table: "Games");
        }
    }
}
