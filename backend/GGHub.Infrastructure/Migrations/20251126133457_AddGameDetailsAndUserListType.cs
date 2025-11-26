using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GGHub.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddGameDetailsAndUserListType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Type",
                table: "UserLists",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Type",
                table: "UserLists");
        }
    }
}
