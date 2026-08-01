using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace GGHub.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddBirthdayGreetings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PreferredLocale",
                table: "Users",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "BirthdayGreetings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    GreetingYear = table.Column<int>(type: "integer", nullable: false),
                    CelebratedOn = table.Column<DateOnly>(type: "date", nullable: false),
                    EmailSentAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    NotificationSentAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BirthdayGreetings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BirthdayGreetings_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BirthdayGreetings_UserId_GreetingYear",
                table: "BirthdayGreetings",
                columns: new[] { "UserId", "GreetingYear" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BirthdayGreetings");

            migrationBuilder.DropColumn(
                name: "PreferredLocale",
                table: "Users");
        }
    }
}
