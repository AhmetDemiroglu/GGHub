using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GGHub.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AiAgentLanguage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Varsayilanlar elle: mevcut ayar satiri %30 Ingilizce oranla, mevcut 10 bot "tr" ile gelsin
            // (EF'in urettigi 0 ve "" ayari ve botlari bozuk birakirdi).
            migrationBuilder.AddColumn<int>(
                name: "EnglishAgentShare",
                table: "AiSettings",
                type: "integer",
                nullable: false,
                defaultValue: 30);

            migrationBuilder.AddColumn<string>(
                name: "Language",
                table: "AiAgentProfiles",
                type: "character varying(8)",
                maxLength: 8,
                nullable: false,
                defaultValue: "tr");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EnglishAgentShare",
                table: "AiSettings");

            migrationBuilder.DropColumn(
                name: "Language",
                table: "AiAgentProfiles");
        }
    }
}
