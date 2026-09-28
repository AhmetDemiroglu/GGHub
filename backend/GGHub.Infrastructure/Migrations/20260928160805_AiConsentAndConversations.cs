using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace GGHub.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AiConsentAndConversations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<bool>(
                name: "AllowAiInteraction",
                table: "Users",
                type: "boolean",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldDefaultValue: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "AiConsentAt",
                table: "Users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AiConsentVersion",
                table: "Users",
                type: "character varying(16)",
                maxLength: 16,
                nullable: true);

            // Mevcut ayar satiri 0 ile acilsaydi bot sohbetleri hic baslamazdi.
            migrationBuilder.AddColumn<int>(
                name: "ConversationsPerDay",
                table: "AiSettings",
                type: "integer",
                nullable: false,
                defaultValue: 8);

            migrationBuilder.AddColumn<int>(
                name: "MaxConversationTurns",
                table: "AiSettings",
                type: "integer",
                nullable: false,
                defaultValue: 8);

            migrationBuilder.AddColumn<int>(
                name: "ConversationId",
                table: "AiAgentTasks",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TargetCommentId",
                table: "AiAgentTasks",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "AiConsentRecords",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    Granted = table.Column<bool>(type: "boolean", nullable: false),
                    TextVersion = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    Source = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AiConsentRecords", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AiConsentRecords_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AiConversations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    RootPostId = table.Column<int>(type: "integer", nullable: false),
                    HostAgentId = table.Column<int>(type: "integer", nullable: false),
                    Kind = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    ParticipantIds = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    GameId = table.Column<int>(type: "integer", nullable: true),
                    Brief = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    StancesJson = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    PlannedTurns = table.Column<int>(type: "integer", nullable: false),
                    TurnsDone = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastActivityAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    FinishedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AiConversations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AiConversations_Posts_RootPostId",
                        column: x => x.RootPostId,
                        principalTable: "Posts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AiConsentRecords_UserId_CreatedAt",
                table: "AiConsentRecords",
                columns: new[] { "UserId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_AiConversations_RootPostId",
                table: "AiConversations",
                column: "RootPostId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AiConversations_Status_CreatedAt",
                table: "AiConversations",
                columns: new[] { "Status", "CreatedAt" });

            // --- Veri: AI etkilesimi artik acik riza ile acilir (Apple 5.1.2(i)) ---
            // 1) Bot olmayan herkes kapali baslar; onay veren tekrar acar.
            migrationBuilder.Sql("""
                UPDATE "Users" SET "AllowAiInteraction" = FALSE, "AiConsentAt" = NULL
                WHERE NOT "IsAiAgent";
                """);

            // 2) Botlarin insanlari takibi kalkar (rizasiz etkilesim). Bot-bot takibi kalir.
            migrationBuilder.Sql("""
                DELETE FROM "Follows" f
                USING "Users" follower, "Users" followee
                WHERE f."FollowerId" = follower."Id" AND follower."IsAiAgent"
                  AND f."FolloweeId" = followee."Id" AND NOT followee."IsAiAgent";
                """);

            // 3) Insanlara yonelik bekleyen bot gorevleri atlanir (Pending=0 -> Skipped=3).
            migrationBuilder.Sql("""
                UPDATE "AiAgentTasks" t
                SET "Status" = 3, "Error" = 'AI etkilesimi artik acik riza ister (29 Eyl 2026).'
                FROM "Users" u
                WHERE t."TargetUserId" = u."Id" AND NOT u."IsAiAgent" AND t."Status" = 0;
                """);

            // 4) Bot hesaplari herkese acik (profil, gonderi, yanit izni, mesaj = 0).
            migrationBuilder.Sql("""
                UPDATE "Users"
                SET "ProfileVisibility" = 0, "PostVisibility" = 0, "PostReplyPermission" = 0, "MessageSetting" = 0
                WHERE "IsAiAgent";
                """);

            // 5) Bot basina gunluk islem: eski varsayilan 10 ise yeni varsayilan 14.
            migrationBuilder.Sql("""
                UPDATE "AiSettings" SET "DailyActionsPerAgent" = 14 WHERE "DailyActionsPerAgent" = 10;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AiConsentRecords");

            migrationBuilder.DropTable(
                name: "AiConversations");

            migrationBuilder.DropColumn(
                name: "AiConsentAt",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "AiConsentVersion",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "ConversationsPerDay",
                table: "AiSettings");

            migrationBuilder.DropColumn(
                name: "MaxConversationTurns",
                table: "AiSettings");

            migrationBuilder.DropColumn(
                name: "ConversationId",
                table: "AiAgentTasks");

            migrationBuilder.DropColumn(
                name: "TargetCommentId",
                table: "AiAgentTasks");

            migrationBuilder.AlterColumn<bool>(
                name: "AllowAiInteraction",
                table: "Users",
                type: "boolean",
                nullable: false,
                defaultValue: true,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldDefaultValue: false);
        }
    }
}
