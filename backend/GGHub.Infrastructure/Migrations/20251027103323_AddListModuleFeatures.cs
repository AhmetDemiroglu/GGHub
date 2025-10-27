using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GGHub.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddListModuleFeatures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "IsPublic",
                table: "UserLists",
                newName: "Visibility");

            migrationBuilder.AddColumn<double>(
                name: "AverageRating",
                table: "UserLists",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<int>(
                name: "Category",
                table: "UserLists",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "RatingCount",
                table: "UserLists",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "UserListComments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Content = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    UserId = table.Column<int>(type: "INTEGER", nullable: false),
                    UserListId = table.Column<int>(type: "INTEGER", nullable: false),
                    ParentCommentId = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserListComments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserListComments_UserListComments_ParentCommentId",
                        column: x => x.ParentCommentId,
                        principalTable: "UserListComments",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_UserListComments_UserLists_UserListId",
                        column: x => x.UserListId,
                        principalTable: "UserLists",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserListComments_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserListRatings",
                columns: table => new
                {
                    UserId = table.Column<int>(type: "INTEGER", nullable: false),
                    UserListId = table.Column<int>(type: "INTEGER", nullable: false),
                    Value = table.Column<int>(type: "INTEGER", nullable: false),
                    SubmittedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserListRatings", x => new { x.UserId, x.UserListId });
                    table.ForeignKey(
                        name: "FK_UserListRatings_UserLists_UserListId",
                        column: x => x.UserListId,
                        principalTable: "UserLists",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserListRatings_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserListCommentVotes",
                columns: table => new
                {
                    UserId = table.Column<int>(type: "INTEGER", nullable: false),
                    UserListCommentId = table.Column<int>(type: "INTEGER", nullable: false),
                    Value = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserListCommentVotes", x => new { x.UserId, x.UserListCommentId });
                    table.ForeignKey(
                        name: "FK_UserListCommentVotes_UserListComments_UserListCommentId",
                        column: x => x.UserListCommentId,
                        principalTable: "UserListComments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserListCommentVotes_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_UserListComments_ParentCommentId",
                table: "UserListComments",
                column: "ParentCommentId");

            migrationBuilder.CreateIndex(
                name: "IX_UserListComments_UserId",
                table: "UserListComments",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_UserListComments_UserListId",
                table: "UserListComments",
                column: "UserListId");

            migrationBuilder.CreateIndex(
                name: "IX_UserListCommentVotes_UserListCommentId",
                table: "UserListCommentVotes",
                column: "UserListCommentId");

            migrationBuilder.CreateIndex(
                name: "IX_UserListRatings_UserListId",
                table: "UserListRatings",
                column: "UserListId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UserListCommentVotes");

            migrationBuilder.DropTable(
                name: "UserListRatings");

            migrationBuilder.DropTable(
                name: "UserListComments");

            migrationBuilder.DropColumn(
                name: "AverageRating",
                table: "UserLists");

            migrationBuilder.DropColumn(
                name: "Category",
                table: "UserLists");

            migrationBuilder.DropColumn(
                name: "RatingCount",
                table: "UserLists");

            migrationBuilder.RenameColumn(
                name: "Visibility",
                table: "UserLists",
                newName: "IsPublic");
        }
    }
}
