using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace GGHub.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddGeminiBudgetAndDetailBackfill : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Locale",
                table: "PushTokens",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ActorUserId",
                table: "Notifications",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MessageArgs",
                table: "Notifications",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MessageKey",
                table: "Notifications",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DetailSyncedAt",
                table: "Games",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "GeminiUsages",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PeriodKey = table.Column<string>(type: "character varying(7)", maxLength: 7, nullable: false),
                    SpentUsd = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: false),
                    InputTokens = table.Column<long>(type: "bigint", nullable: false),
                    OutputTokens = table.Column<long>(type: "bigint", nullable: false),
                    CallCount = table.Column<int>(type: "integer", nullable: false),
                    LastUpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GeminiUsages", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ReviewComments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Content = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    ReviewId = table.Column<int>(type: "integer", nullable: false),
                    ParentCommentId = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReviewComments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ReviewComments_ReviewComments_ParentCommentId",
                        column: x => x.ParentCommentId,
                        principalTable: "ReviewComments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ReviewComments_Reviews_ReviewId",
                        column: x => x.ReviewId,
                        principalTable: "Reviews",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ReviewComments_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ReviewCommentVotes",
                columns: table => new
                {
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    ReviewCommentId = table.Column<int>(type: "integer", nullable: false),
                    Value = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReviewCommentVotes", x => new { x.UserId, x.ReviewCommentId });
                    table.ForeignKey(
                        name: "FK_ReviewCommentVotes_ReviewComments_ReviewCommentId",
                        column: x => x.ReviewCommentId,
                        principalTable: "ReviewComments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ReviewCommentVotes_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_ActorUserId",
                table: "Notifications",
                column: "ActorUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Games_DetailBackfillQueue",
                table: "Games",
                columns: new[] { "DetailSyncedAt", "RawgAdded" },
                filter: "\"DetailSyncedAt\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Games_MetacriticQueue",
                table: "Games",
                columns: new[] { "MetacriticUrl", "LastSyncedAt" },
                filter: "\"Metacritic\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_GeminiUsages_PeriodKey",
                table: "GeminiUsages",
                column: "PeriodKey",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ReviewComments_ParentCommentId",
                table: "ReviewComments",
                column: "ParentCommentId");

            migrationBuilder.CreateIndex(
                name: "IX_ReviewComments_ReviewId_ParentCommentId",
                table: "ReviewComments",
                columns: new[] { "ReviewId", "ParentCommentId" });

            migrationBuilder.CreateIndex(
                name: "IX_ReviewComments_UserId",
                table: "ReviewComments",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_ReviewCommentVotes_ReviewCommentId",
                table: "ReviewCommentVotes",
                column: "ReviewCommentId");

            migrationBuilder.AddForeignKey(
                name: "FK_Notifications_Users_ActorUserId",
                table: "Notifications",
                column: "ActorUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Notifications_Users_ActorUserId",
                table: "Notifications");

            migrationBuilder.DropTable(
                name: "GeminiUsages");

            migrationBuilder.DropTable(
                name: "ReviewCommentVotes");

            migrationBuilder.DropTable(
                name: "ReviewComments");

            migrationBuilder.DropIndex(
                name: "IX_Notifications_ActorUserId",
                table: "Notifications");

            migrationBuilder.DropIndex(
                name: "IX_Games_DetailBackfillQueue",
                table: "Games");

            migrationBuilder.DropIndex(
                name: "IX_Games_MetacriticQueue",
                table: "Games");

            migrationBuilder.DropColumn(
                name: "Locale",
                table: "PushTokens");

            migrationBuilder.DropColumn(
                name: "ActorUserId",
                table: "Notifications");

            migrationBuilder.DropColumn(
                name: "MessageArgs",
                table: "Notifications");

            migrationBuilder.DropColumn(
                name: "MessageKey",
                table: "Notifications");

            migrationBuilder.DropColumn(
                name: "DetailSyncedAt",
                table: "Games");
        }
    }
}
