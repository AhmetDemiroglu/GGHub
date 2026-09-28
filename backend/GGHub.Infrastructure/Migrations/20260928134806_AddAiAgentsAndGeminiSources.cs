using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace GGHub.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAiAgentsAndGeminiSources : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_GeminiUsages_PeriodKey",
                table: "GeminiUsages");

            migrationBuilder.AddColumn<bool>(
                name: "AllowAiInteraction",
                table: "Users",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsAiAgent",
                table: "Users",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Model",
                table: "GeminiUsages",
                type: "character varying(48)",
                maxLength: 48,
                nullable: false,
                defaultValue: "gemini-3.1-flash-lite");

            migrationBuilder.AddColumn<string>(
                name: "Source",
                table: "GeminiUsages",
                type: "character varying(16)",
                maxLength: 16,
                nullable: false,
                defaultValue: "translation");

            migrationBuilder.CreateTable(
                name: "AiAgentProfiles",
                columns: table => new
                {
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    PersonaKey = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Persona = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    FavoriteGenres = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    RatingBias = table.Column<int>(type: "integer", nullable: false),
                    DailyActionQuota = table.Column<int>(type: "integer", nullable: false),
                    IsEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AiAgentProfiles", x => x.UserId);
                    table.ForeignKey(
                        name: "FK_AiAgentProfiles_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AiAgentTasks",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    AgentUserId = table.Column<int>(type: "integer", nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    TargetUserId = table.Column<int>(type: "integer", nullable: true),
                    TargetPostId = table.Column<int>(type: "integer", nullable: true),
                    TargetGameId = table.Column<int>(type: "integer", nullable: true),
                    TargetReviewId = table.Column<int>(type: "integer", nullable: true),
                    TriggerMessageId = table.Column<int>(type: "integer", nullable: true),
                    ScheduledAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    StartedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Attempts = table.Column<int>(type: "integer", nullable: false),
                    Model = table.Column<string>(type: "character varying(48)", maxLength: 48, nullable: true),
                    InputTokens = table.Column<int>(type: "integer", nullable: false),
                    OutputTokens = table.Column<int>(type: "integer", nullable: false),
                    ResultEntityId = table.Column<int>(type: "integer", nullable: true),
                    ResultSummary = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    Error = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AiAgentTasks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AiAgentTasks_Users_AgentUserId",
                        column: x => x.AgentUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AiSettings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false),
                    AgentsEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    TranslationMonthlyBudgetTry = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    AgentMonthlyBudgetTry = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    UsdToTryRate = table.Column<decimal>(type: "numeric(12,4)", precision: 12, scale: 4, nullable: false),
                    PrimaryModel = table.Column<string>(type: "character varying(48)", maxLength: 48, nullable: false),
                    FallbackModel = table.Column<string>(type: "character varying(48)", maxLength: 48, nullable: false),
                    PrimaryModelRpm = table.Column<int>(type: "integer", nullable: false),
                    DailyActionsPerAgent = table.Column<int>(type: "integer", nullable: false),
                    MaxAgentMessagesPerUserPerDay = table.Column<int>(type: "integer", nullable: false),
                    MaxUnsolicitedDmPerUserPerWeek = table.Column<int>(type: "integer", nullable: false),
                    MaxAgentRepliesPerPost = table.Column<int>(type: "integer", nullable: false),
                    FeedMaxAiSharePercent = table.Column<int>(type: "integer", nullable: false),
                    ActiveFromHour = table.Column<int>(type: "integer", nullable: false),
                    ActiveToHour = table.Column<int>(type: "integer", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AiSettings", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Users_IsAiAgent",
                table: "Users",
                column: "IsAiAgent",
                filter: "\"IsAiAgent\" = TRUE");

            migrationBuilder.CreateIndex(
                name: "IX_GeminiUsages_PeriodKey_Source_Model",
                table: "GeminiUsages",
                columns: new[] { "PeriodKey", "Source", "Model" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AiAgentProfiles_PersonaKey",
                table: "AiAgentProfiles",
                column: "PersonaKey",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AiAgentTasks_AgentUserId_CreatedAt",
                table: "AiAgentTasks",
                columns: new[] { "AgentUserId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_AiAgentTasks_Status_ScheduledAt",
                table: "AiAgentTasks",
                columns: new[] { "Status", "ScheduledAt" });

            migrationBuilder.CreateIndex(
                name: "IX_AiAgentTasks_TargetUserId_Type_CreatedAt",
                table: "AiAgentTasks",
                columns: new[] { "TargetUserId", "Type", "CreatedAt" },
                filter: "\"TargetUserId\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AiAgentProfiles");

            migrationBuilder.DropTable(
                name: "AiAgentTasks");

            migrationBuilder.DropTable(
                name: "AiSettings");

            migrationBuilder.DropIndex(
                name: "IX_Users_IsAiAgent",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_GeminiUsages_PeriodKey_Source_Model",
                table: "GeminiUsages");

            migrationBuilder.DropColumn(
                name: "AllowAiInteraction",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "IsAiAgent",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Model",
                table: "GeminiUsages");

            migrationBuilder.DropColumn(
                name: "Source",
                table: "GeminiUsages");

            migrationBuilder.CreateIndex(
                name: "IX_GeminiUsages_PeriodKey",
                table: "GeminiUsages",
                column: "PeriodKey",
                unique: true);
        }
    }
}
