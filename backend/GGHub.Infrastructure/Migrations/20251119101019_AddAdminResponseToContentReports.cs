using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GGHub.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAdminResponseToContentReports : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AdminResponse",
                table: "ContentReports",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ResolvedByAdminId",
                table: "ContentReports",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AdminResponse",
                table: "ContentReports");

            migrationBuilder.DropColumn(
                name: "ResolvedByAdminId",
                table: "ContentReports");
        }
    }
}
