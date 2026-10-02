using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GGHub.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class HideSystemListsFromPublic : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Istek listesi (1) ve favoriler (2) sistem listesidir; kendi sayfalarinda gorunur.
            // Favoriler eskiden Public doguyordu, liste olarak gizliye (2) cekilir.
            migrationBuilder.Sql(@"UPDATE ""UserLists"" SET ""Visibility"" = 2 WHERE ""Type"" IN (1, 2) AND ""Visibility"" <> 2;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Veri duzeltmesi; geri alinmaz.
        }
    }
}
