-- Drop existing tables (if any)
DROP TABLE IF EXISTS "UserListCommentVotes" CASCADE;
DROP TABLE IF EXISTS "UserListRatings" CASCADE;
DROP TABLE IF EXISTS "UserListGames" CASCADE;
DROP TABLE IF EXISTS "UserListFollows" CASCADE;
DROP TABLE IF EXISTS "UserListComments" CASCADE;
DROP TABLE IF EXISTS "ReviewVotes" CASCADE;
DROP TABLE IF EXISTS "UserLists" CASCADE;
DROP TABLE IF EXISTS "UserBlocks" CASCADE;
DROP TABLE IF EXISTS "Reviews" CASCADE;
DROP TABLE IF EXISTS "RefreshTokens" CASCADE;
DROP TABLE IF EXISTS "Notifications" CASCADE;
DROP TABLE IF EXISTS "Messages" CASCADE;
DROP TABLE IF EXISTS "Follows" CASCADE;
DROP TABLE IF EXISTS "ContentReports" CASCADE;
DROP TABLE IF EXISTS "Users" CASCADE;
DROP TABLE IF EXISTS "Games" CASCADE;
DROP TABLE IF EXISTS "AuditLogs" CASCADE;

-- AuditLogs
CREATE TABLE "AuditLogs" (
    "Id" SERIAL PRIMARY KEY,
    "UserId" INTEGER NOT NULL,
    "ActionType" VARCHAR(255) NOT NULL,
    "EntityType" VARCHAR(255) NOT NULL,
    "EntityId" INTEGER NOT NULL,
    "Timestamp" TIMESTAMP WITH TIME ZONE NOT NULL,
    "Changes" TEXT
);

-- Games
CREATE TABLE "Games" (
    "Id" SERIAL PRIMARY KEY,
    "RawgId" INTEGER NOT NULL,
    "Slug" VARCHAR(500) NOT NULL,
    "Name" VARCHAR(500) NOT NULL,
    "Released" VARCHAR(50),
    "BackgroundImage" TEXT,
    "Rating" DOUBLE PRECISION,
    "Metacritic" INTEGER,
    "Description" TEXT,
    "CoverImage" TEXT,
    "LastSyncedAt" TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Users
CREATE TABLE "Users" (
    "Id" SERIAL PRIMARY KEY,
    "Username" VARCHAR(255) NOT NULL,
    "Email" VARCHAR(255) NOT NULL,
    "PasswordHash" BYTEA NOT NULL,
    "PasswordSalt" BYTEA NOT NULL,
    "FirstName" VARCHAR(255),
    "LastName" VARCHAR(255),
    "Bio" TEXT,
    "ProfileImageUrl" TEXT,
    "DateOfBirth" TIMESTAMP WITH TIME ZONE,
    "CreatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "UpdatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "IsDeleted" BOOLEAN NOT NULL DEFAULT FALSE,
    "Role" VARCHAR(50) NOT NULL DEFAULT 'User',
    "MessageSetting" INTEGER NOT NULL DEFAULT 0,
    "ProfileVisibility" INTEGER NOT NULL DEFAULT 0,
    "Status" VARCHAR(255),
    "PhoneNumber" VARCHAR(50),
    "IsEmailPublic" BOOLEAN NOT NULL DEFAULT FALSE,
    "IsPhoneNumberPublic" BOOLEAN NOT NULL DEFAULT FALSE,
    "IsEmailVerified" BOOLEAN NOT NULL DEFAULT FALSE,
    "EmailVerificationToken" VARCHAR(255),
    "IsDateOfBirthPublic" BOOLEAN NOT NULL DEFAULT FALSE
);

-- ContentReports
CREATE TABLE "ContentReports" (
    "Id" SERIAL PRIMARY KEY,
    "EntityType" VARCHAR(255) NOT NULL,
    "EntityId" INTEGER NOT NULL,
    "ReporterUserId" INTEGER NOT NULL,
    "Reason" TEXT NOT NULL,
    "Status" INTEGER NOT NULL DEFAULT 0,
    "CreatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "ResolvedAt" TIMESTAMP WITH TIME ZONE,
    CONSTRAINT "FK_ContentReports_Users_ReporterUserId" FOREIGN KEY ("ReporterUserId") 
        REFERENCES "Users"("Id") ON DELETE CASCADE
);

-- Follows
CREATE TABLE "Follows" (
    "FollowerId" INTEGER NOT NULL,
    "FolloweeId" INTEGER NOT NULL,
    PRIMARY KEY ("FollowerId", "FolloweeId"),
    CONSTRAINT "FK_Follows_Users_FolloweeId" FOREIGN KEY ("FolloweeId") 
        REFERENCES "Users"("Id") ON DELETE RESTRICT,
    CONSTRAINT "FK_Follows_Users_FollowerId" FOREIGN KEY ("FollowerId") 
        REFERENCES "Users"("Id") ON DELETE RESTRICT
);

-- Messages
CREATE TABLE "Messages" (
    "Id" SERIAL PRIMARY KEY,
    "SenderId" INTEGER NOT NULL,
    "RecipientId" INTEGER NOT NULL,
    "Content" TEXT NOT NULL,
    "ReadAt" TIMESTAMP WITH TIME ZONE,
    "SentAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "SenderDeleted" BOOLEAN NOT NULL DEFAULT FALSE,
    "RecipientDeleted" BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT "FK_Messages_Users_RecipientId" FOREIGN KEY ("RecipientId") 
        REFERENCES "Users"("Id") ON DELETE RESTRICT,
    CONSTRAINT "FK_Messages_Users_SenderId" FOREIGN KEY ("SenderId") 
        REFERENCES "Users"("Id") ON DELETE RESTRICT
);

-- Notifications
CREATE TABLE "Notifications" (
    "Id" SERIAL PRIMARY KEY,
    "RecipientUserId" INTEGER NOT NULL,
    "Message" TEXT NOT NULL,
    "Link" TEXT,
    "IsRead" BOOLEAN NOT NULL DEFAULT FALSE,
    "Type" INTEGER NOT NULL,
    "CreatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT "FK_Notifications_Users_RecipientUserId" FOREIGN KEY ("RecipientUserId") 
        REFERENCES "Users"("Id") ON DELETE CASCADE
);

-- RefreshTokens
CREATE TABLE "RefreshTokens" (
    "Id" SERIAL PRIMARY KEY,
    "Token" VARCHAR(500) NOT NULL,
    "ExpiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "CreatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "RevokedAt" TIMESTAMP WITH TIME ZONE,
    "UserId" INTEGER NOT NULL,
    "Type" INTEGER NOT NULL,
    CONSTRAINT "FK_RefreshTokens_Users_UserId" FOREIGN KEY ("UserId") 
        REFERENCES "Users"("Id") ON DELETE CASCADE
);

-- Reviews
CREATE TABLE "Reviews" (
    "Id" SERIAL PRIMARY KEY,
    "Content" TEXT NOT NULL,
    "Rating" INTEGER NOT NULL,
    "CreatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "UpdatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "UserId" INTEGER NOT NULL,
    "GameId" INTEGER NOT NULL,
    CONSTRAINT "FK_Reviews_Games_GameId" FOREIGN KEY ("GameId") 
        REFERENCES "Games"("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_Reviews_Users_UserId" FOREIGN KEY ("UserId") 
        REFERENCES "Users"("Id") ON DELETE CASCADE
);

-- UserBlocks
CREATE TABLE "UserBlocks" (
    "BlockerId" INTEGER NOT NULL,
    "BlockedId" INTEGER NOT NULL,
    "BlockedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY ("BlockerId", "BlockedId"),
    CONSTRAINT "FK_UserBlocks_Users_BlockedId" FOREIGN KEY ("BlockedId") 
        REFERENCES "Users"("Id") ON DELETE RESTRICT,
    CONSTRAINT "FK_UserBlocks_Users_BlockerId" FOREIGN KEY ("BlockerId") 
        REFERENCES "Users"("Id") ON DELETE RESTRICT
);

-- UserLists
CREATE TABLE "UserLists" (
    "Id" SERIAL PRIMARY KEY,
    "Name" VARCHAR(500) NOT NULL,
    "Description" TEXT,
    "Visibility" INTEGER NOT NULL,
    "Category" INTEGER NOT NULL,
    "CreatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "UpdatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "UserId" INTEGER NOT NULL,
    "AverageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "RatingCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "FK_UserLists_Users_UserId" FOREIGN KEY ("UserId") 
        REFERENCES "Users"("Id") ON DELETE CASCADE
);

-- ReviewVotes
CREATE TABLE "ReviewVotes" (
    "Id" SERIAL PRIMARY KEY,
    "Value" INTEGER NOT NULL,
    "UserId" INTEGER NOT NULL,
    "ReviewId" INTEGER NOT NULL,
    CONSTRAINT "FK_ReviewVotes_Reviews_ReviewId" FOREIGN KEY ("ReviewId") 
        REFERENCES "Reviews"("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_ReviewVotes_Users_UserId" FOREIGN KEY ("UserId") 
        REFERENCES "Users"("Id") ON DELETE CASCADE
);

-- UserListComments
CREATE TABLE "UserListComments" (
    "Id" SERIAL PRIMARY KEY,
    "Content" TEXT NOT NULL,
    "CreatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "UpdatedAt" TIMESTAMP WITH TIME ZONE,
    "UserId" INTEGER NOT NULL,
    "UserListId" INTEGER NOT NULL,
    "ParentCommentId" INTEGER,
    CONSTRAINT "FK_UserListComments_UserListComments_ParentCommentId" FOREIGN KEY ("ParentCommentId") 
        REFERENCES "UserListComments"("Id"),
    CONSTRAINT "FK_UserListComments_UserLists_UserListId" FOREIGN KEY ("UserListId") 
        REFERENCES "UserLists"("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_UserListComments_Users_UserId" FOREIGN KEY ("UserId") 
        REFERENCES "Users"("Id") ON DELETE CASCADE
);

-- UserListFollows
CREATE TABLE "UserListFollows" (
    "FollowerUserId" INTEGER NOT NULL,
    "FollowedListId" INTEGER NOT NULL,
    PRIMARY KEY ("FollowerUserId", "FollowedListId"),
    CONSTRAINT "FK_UserListFollows_UserLists_FollowedListId" FOREIGN KEY ("FollowedListId") 
        REFERENCES "UserLists"("Id") ON DELETE RESTRICT,
    CONSTRAINT "FK_UserListFollows_Users_FollowerUserId" FOREIGN KEY ("FollowerUserId") 
        REFERENCES "Users"("Id") ON DELETE RESTRICT
);

-- UserListGames
CREATE TABLE "UserListGames" (
    "UserListId" INTEGER NOT NULL,
    "GameId" INTEGER NOT NULL,
    "AddedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "SortOrder" INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY ("UserListId", "GameId"),
    CONSTRAINT "FK_UserListGames_Games_GameId" FOREIGN KEY ("GameId") 
        REFERENCES "Games"("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_UserListGames_UserLists_UserListId" FOREIGN KEY ("UserListId") 
        REFERENCES "UserLists"("Id") ON DELETE CASCADE
);

-- UserListRatings
CREATE TABLE "UserListRatings" (
    "UserId" INTEGER NOT NULL,
    "UserListId" INTEGER NOT NULL,
    "Value" INTEGER NOT NULL,
    "SubmittedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY ("UserId", "UserListId"),
    CONSTRAINT "FK_UserListRatings_UserLists_UserListId" FOREIGN KEY ("UserListId") 
        REFERENCES "UserLists"("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_UserListRatings_Users_UserId" FOREIGN KEY ("UserId") 
        REFERENCES "Users"("Id") ON DELETE CASCADE
);

-- UserListCommentVotes
CREATE TABLE "UserListCommentVotes" (
    "UserId" INTEGER NOT NULL,
    "UserListCommentId" INTEGER NOT NULL,
    "Value" INTEGER NOT NULL,
    PRIMARY KEY ("UserId", "UserListCommentId"),
    CONSTRAINT "FK_UserListCommentVotes_UserListComments_UserListCommentId" FOREIGN KEY ("UserListCommentId") 
        REFERENCES "UserListComments"("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_UserListCommentVotes_Users_UserId" FOREIGN KEY ("UserId") 
        REFERENCES "Users"("Id") ON DELETE CASCADE
);

-- Create Indexes
CREATE INDEX "IX_ContentReports_ReporterUserId" ON "ContentReports"("ReporterUserId");
CREATE INDEX "IX_Follows_FolloweeId" ON "Follows"("FolloweeId");
CREATE INDEX "IX_Messages_RecipientId" ON "Messages"("RecipientId");
CREATE INDEX "IX_Messages_SenderId" ON "Messages"("SenderId");
CREATE INDEX "IX_Notifications_RecipientUserId" ON "Notifications"("RecipientUserId");
CREATE INDEX "IX_RefreshTokens_UserId" ON "RefreshTokens"("UserId");
CREATE INDEX "IX_Reviews_GameId" ON "Reviews"("GameId");
CREATE UNIQUE INDEX "IX_Reviews_UserId_GameId" ON "Reviews"("UserId", "GameId");
CREATE INDEX "IX_ReviewVotes_ReviewId" ON "ReviewVotes"("ReviewId");
CREATE INDEX "IX_ReviewVotes_UserId" ON "ReviewVotes"("UserId");
CREATE INDEX "IX_UserBlocks_BlockedId" ON "UserBlocks"("BlockedId");
CREATE INDEX "IX_UserListComments_ParentCommentId" ON "UserListComments"("ParentCommentId");
CREATE INDEX "IX_UserListComments_UserId" ON "UserListComments"("UserId");
CREATE INDEX "IX_UserListComments_UserListId" ON "UserListComments"("UserListId");
CREATE INDEX "IX_UserListCommentVotes_UserListCommentId" ON "UserListCommentVotes"("UserListCommentId");
CREATE INDEX "IX_UserListFollows_FollowedListId" ON "UserListFollows"("FollowedListId");
CREATE INDEX "IX_UserListGames_GameId" ON "UserListGames"("GameId");
CREATE INDEX "IX_UserListRatings_UserListId" ON "UserListRatings"("UserListId");
CREATE INDEX "IX_UserLists_UserId" ON "UserLists"("UserId");