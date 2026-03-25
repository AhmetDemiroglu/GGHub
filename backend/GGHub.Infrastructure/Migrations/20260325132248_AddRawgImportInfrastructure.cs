using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace GGHub.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddRawgImportInfrastructure : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"DROP INDEX IF EXISTS ""IX_Notifications_RecipientUserId"";");
            migrationBuilder.Sql(@"DROP INDEX IF EXISTS ""IX_Messages_RecipientId"";");
            migrationBuilder.Sql(@"DROP INDEX IF EXISTS ""IX_Messages_SenderId"";");

            migrationBuilder.AddColumn<string>(
                name: "ImportSource",
                table: "Games",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ImportedAt",
                table: "Games",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RawgAdded",
                table: "Games",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RawgRatingsCount",
                table: "Games",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "RawgImportCheckpoints",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    StrategyKey = table.Column<string>(type: "text", nullable: false),
                    CurrentPage = table.Column<int>(type: "integer", nullable: false),
                    TotalProcessed = table.Column<int>(type: "integer", nullable: false),
                    TotalAdded = table.Column<int>(type: "integer", nullable: false),
                    TotalSkipped = table.Column<int>(type: "integer", nullable: false),
                    TotalFiltered = table.Column<int>(type: "integer", nullable: false),
                    TotalDuplicate = table.Column<int>(type: "integer", nullable: false),
                    TotalUpdated = table.Column<int>(type: "integer", nullable: false),
                    IsCompleted = table.Column<bool>(type: "boolean", nullable: false),
                    LastRunAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastError = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RawgImportCheckpoints", x => x.Id);
                });

            migrationBuilder.Sql(
                @"CREATE INDEX IF NOT EXISTS ""IX_Notifications_RecipientUserId_CreatedAt"" ON ""Notifications"" (""RecipientUserId"", ""CreatedAt"");");

            migrationBuilder.Sql(
                @"CREATE INDEX IF NOT EXISTS ""IX_Notifications_RecipientUserId_IsRead"" ON ""Notifications"" (""RecipientUserId"", ""IsRead"");");

            migrationBuilder.Sql(
                @"CREATE INDEX IF NOT EXISTS ""IX_Messages_RecipientId_ReadAt_RecipientDeleted"" ON ""Messages"" (""RecipientId"", ""ReadAt"", ""RecipientDeleted"");");

            migrationBuilder.Sql(
                @"CREATE INDEX IF NOT EXISTS ""IX_Messages_SenderId_RecipientId_SentAt"" ON ""Messages"" (""SenderId"", ""RecipientId"", ""SentAt"");");

            migrationBuilder.Sql(
                @"CREATE INDEX IF NOT EXISTS ""IX_Games_ImportSource"" ON ""Games"" (""ImportSource"");");

            migrationBuilder.Sql(
                @"CREATE UNIQUE INDEX IF NOT EXISTS ""IX_Games_RawgId"" ON ""Games"" (""RawgId"");");

            migrationBuilder.CreateIndex(
                name: "IX_RawgImportCheckpoints_StrategyKey",
                table: "RawgImportCheckpoints",
                column: "StrategyKey",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RawgImportCheckpoints");

            migrationBuilder.DropIndex(
                name: "IX_Notifications_RecipientUserId_CreatedAt",
                table: "Notifications");

            migrationBuilder.DropIndex(
                name: "IX_Notifications_RecipientUserId_IsRead",
                table: "Notifications");

            migrationBuilder.DropIndex(
                name: "IX_Messages_RecipientId_ReadAt_RecipientDeleted",
                table: "Messages");

            migrationBuilder.DropIndex(
                name: "IX_Messages_SenderId_RecipientId_SentAt",
                table: "Messages");

            migrationBuilder.DropIndex(
                name: "IX_Games_ImportSource",
                table: "Games");

            migrationBuilder.DropIndex(
                name: "IX_Games_RawgId",
                table: "Games");

            migrationBuilder.DropColumn(
                name: "ImportSource",
                table: "Games");

            migrationBuilder.DropColumn(
                name: "ImportedAt",
                table: "Games");

            migrationBuilder.DropColumn(
                name: "RawgAdded",
                table: "Games");

            migrationBuilder.DropColumn(
                name: "RawgRatingsCount",
                table: "Games");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_RecipientUserId",
                table: "Notifications",
                column: "RecipientUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Messages_RecipientId",
                table: "Messages",
                column: "RecipientId");

            migrationBuilder.CreateIndex(
                name: "IX_Messages_SenderId",
                table: "Messages",
                column: "SenderId");
        }
    }
}
