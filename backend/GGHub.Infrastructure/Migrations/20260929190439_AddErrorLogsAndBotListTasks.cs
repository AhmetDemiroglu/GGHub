using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace GGHub.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddErrorLogsAndBotListTasks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_UserListComments_UserListComments_ParentCommentId",
                table: "UserListComments");

            migrationBuilder.AddColumn<int>(
                name: "TargetListId",
                table: "AiAgentTasks",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ErrorGroups",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Fingerprint = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Source = table.Column<int>(type: "integer", nullable: false),
                    ExceptionType = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    Message = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    Logger = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    Method = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: true),
                    RouteTemplate = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    StatusCode = table.Column<int>(type: "integer", nullable: true),
                    Count = table.Column<int>(type: "integer", nullable: false),
                    FirstSeenAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastSeenAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    ResolvedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastNotifiedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Note = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ErrorGroups", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ErrorEvents",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ErrorGroupId = table.Column<int>(type: "integer", nullable: false),
                    OccurredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Message = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    StackTrace = table.Column<string>(type: "text", nullable: true),
                    InnerChain = table.Column<string>(type: "text", nullable: true),
                    Method = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: true),
                    Path = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
                    QueryString = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: true),
                    StatusCode = table.Column<int>(type: "integer", nullable: true),
                    UserId = table.Column<int>(type: "integer", nullable: true),
                    Username = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    UserAgent = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
                    Locale = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: true),
                    TraceId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    Environment = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ErrorEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ErrorEvents_ErrorGroups_ErrorGroupId",
                        column: x => x.ErrorGroupId,
                        principalTable: "ErrorGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ErrorEvents_ErrorGroupId_OccurredAt",
                table: "ErrorEvents",
                columns: new[] { "ErrorGroupId", "OccurredAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ErrorEvents_OccurredAt",
                table: "ErrorEvents",
                column: "OccurredAt");

            migrationBuilder.CreateIndex(
                name: "IX_ErrorGroups_Fingerprint",
                table: "ErrorGroups",
                column: "Fingerprint",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ErrorGroups_Status_LastSeenAt",
                table: "ErrorGroups",
                columns: new[] { "Status", "LastSeenAt" });

            migrationBuilder.AddForeignKey(
                name: "FK_UserListComments_UserListComments_ParentCommentId",
                table: "UserListComments",
                column: "ParentCommentId",
                principalTable: "UserListComments",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            // Kendiliginden bot DM'i: haftalik tavan 1'den 3'e (Ahmet karari, 29 Eyl 2026).
            // Yalnizca eski varsayilanda (1) duran satir guncellenir; admin baska bir deger
            // sectiyse ona dokunulmaz. Down'da geri alinmaz: admin ayari, sema degil.
            migrationBuilder.Sql(
                "UPDATE \"AiSettings\" SET \"MaxUnsolicitedDmPerUserPerWeek\" = 3 WHERE \"MaxUnsolicitedDmPerUserPerWeek\" = 1;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_UserListComments_UserListComments_ParentCommentId",
                table: "UserListComments");

            migrationBuilder.DropTable(
                name: "ErrorEvents");

            migrationBuilder.DropTable(
                name: "ErrorGroups");

            migrationBuilder.DropColumn(
                name: "TargetListId",
                table: "AiAgentTasks");

            migrationBuilder.AddForeignKey(
                name: "FK_UserListComments_UserListComments_ParentCommentId",
                table: "UserListComments",
                column: "ParentCommentId",
                principalTable: "UserListComments",
                principalColumn: "Id");
        }
    }
}
