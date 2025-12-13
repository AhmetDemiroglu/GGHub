using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using GGHub.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace GGHub.Infrastructure.Persistence
{
    public class GGHubDbContext : DbContext
    {
        public GGHubDbContext(DbContextOptions<GGHubDbContext> options) : base(options)
        {
        }
        public DbSet<Game> Games { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<Review> Reviews { get; set; }
        public DbSet<ReviewVote> ReviewVotes { get; set; }
        public DbSet<UserList> UserLists { get; set; }
        public DbSet<UserListGame> UserListGames { get; set; }
        public DbSet<RefreshToken> RefreshTokens { get; set; }
        public DbSet<Follow> Follows { get; set; }
        public DbSet<AuditLog> AuditLogs { get; set; }
        public DbSet<ContentReport> ContentReports { get; set; }
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<UserListFollow> UserListFollows { get; set; }
        public DbSet<Message> Messages { get; set; }
        public DbSet<UserBlock> UserBlocks { get; set; }
        public DbSet<UserListRating> UserListRatings { get; set; }
        public DbSet<UserListComment> UserListComments { get; set; }
        public DbSet<UserListCommentVote> UserListCommentVotes { get; set; }
        public DbSet<Level> Levels { get; set; }
        public DbSet<Achievement> Achievements { get; set; }
        public DbSet<UserAchievement> UserAchievements { get; set; }
        public DbSet<UserStats> UserStats { get; set; }
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();

            modelBuilder.Entity<User>()
                .HasIndex(u => u.Username)
                .IsUnique();

            modelBuilder.Entity<UserListRating>()
                .HasKey(r => new { r.UserId, r.UserListId });

            modelBuilder.Entity<UserListCommentVote>()
                .HasKey(v => new { v.UserId, v.UserListCommentId });

            modelBuilder.Entity<UserListComment>()
                .HasOne(c => c.ParentComment)
                .WithMany(c => c.Replies)
                .HasForeignKey(c => c.ParentCommentId)
                .OnDelete(DeleteBehavior.ClientSetNull);

            modelBuilder.Entity<UserListGame>()
                .HasKey(ulg => new { ulg.UserListId, ulg.GameId });

            modelBuilder.Entity<Review>()
                .HasIndex(r => new { r.UserId, r.GameId })
                .IsUnique();
            modelBuilder.Entity<Follow>(entity =>
            {
                entity.HasKey(k => new { k.FollowerId, k.FolloweeId });

                entity.HasOne(d => d.Follower)
                    .WithMany(p => p.Following)
                    .HasForeignKey(d => d.FollowerId)
                    .OnDelete(DeleteBehavior.Restrict); 

                entity.HasOne(d => d.Followee)
                    .WithMany(p => p.Followers)
                    .HasForeignKey(d => d.FolloweeId)
                    .OnDelete(DeleteBehavior.Restrict);
            });
            modelBuilder.Entity<UserListFollow>(entity =>
            {
                entity.HasKey(k => new { k.FollowerUserId, k.FollowedListId });

                entity.HasOne(d => d.FollowerUser)
                    .WithMany(p => p.FollowedLists)
                    .HasForeignKey(d => d.FollowerUserId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(d => d.FollowedList)
                    .WithMany(p => p.Followers)
                    .HasForeignKey(d => d.FollowedListId)
                    .OnDelete(DeleteBehavior.Restrict);
            });
            modelBuilder.Entity<Message>(entity =>
            {
                entity.HasOne(d => d.Sender)
                    .WithMany(p => p.MessagesSent)
                    .HasForeignKey(d => d.SenderId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(d => d.Recipient)
                    .WithMany(p => p.MessagesReceived)
                    .HasForeignKey(d => d.RecipientId)
                    .OnDelete(DeleteBehavior.Restrict);
            });
            modelBuilder.Entity<UserBlock>(entity =>
            {
                entity.HasKey(k => new { k.BlockerId, k.BlockedId });

                entity.HasOne(d => d.Blocker)
                    .WithMany(p => p.BlockedUsers)
                    .HasForeignKey(d => d.BlockerId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(d => d.Blocked)
                    .WithMany(p => p.BlockedByUsers)
                    .HasForeignKey(d => d.BlockedId)
                    .OnDelete(DeleteBehavior.Restrict);
            });
            modelBuilder.Entity<UserStats>()
                .HasOne(us => us.User)
                .WithOne(u => u.Stats)
                .HasForeignKey<UserStats>(us => us.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<UserAchievement>()
                .HasKey(ua => new { ua.UserId, ua.AchievementId });
        }
    }

}
