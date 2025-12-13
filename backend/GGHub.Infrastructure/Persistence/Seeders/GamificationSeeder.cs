using GGHub.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace GGHub.Infrastructure.Persistence.Seeders
{
    public static class GamificationSeeder
    {
        public static async Task SeedAsync(GGHubDbContext context)
        {
            // 1. Seviyeleri (Levels) Kontrol Et ve Ekle
            if (!await context.Levels.AnyAsync())
            {
                var levels = new List<Level>
                {
                    new Level { LevelNumber = 1, Name = "Başlangıç", RequiredXp = 0 },
                    new Level { LevelNumber = 2, Name = "Acemi", RequiredXp = 100 },
                    new Level { LevelNumber = 3, Name = "Keşifçi", RequiredXp = 300 },
                    new Level { LevelNumber = 4, Name = "Deneyimli", RequiredXp = 600 },
                    new Level { LevelNumber = 5, Name = "Usta", RequiredXp = 1000 },
                    new Level { LevelNumber = 6, Name = "Efsane", RequiredXp = 2000 },
                    new Level { LevelNumber = 7, Name = "God Mode", RequiredXp = 5000 }
                };

                await context.Levels.AddRangeAsync(levels);
                await context.SaveChangesAsync();
            }

            // 2. Rozetler 
            if (!await context.Achievements.AnyAsync())
            {
                var achievements = new List<Achievement>
                {
                    // Başlangıç Rozeti
                    new Achievement
                    {
                        Title = "Novice",
                        Description = "Topluluğa hoş geldin!",
                        IconUrl = "/assets/badges/Novice.ico",
                        XpReward = 50,
                        CriteriaJson = "{\"Type\": \"Welcome\"}"
                    },
                    // İnceleme Rozeti
                    new Achievement
                    {
                        Title = "Critic",
                        Description = "İlk incelemeni paylaştın.",
                        IconUrl = "/assets/badges/Critic.ico",
                        XpReward = 100,
                        CriteriaJson = "{\"Type\": \"ReviewCreated\", \"Count\": 1}"
                    },
                    // Liste Rozeti
                    new Achievement
                    {
                        Title = "Curator",
                        Description = "İlk koleksiyonunu oluşturdun.",
                        IconUrl = "/assets/badges/Curator.ico",
                        XpReward = 150,
                        CriteriaJson = "{\"Type\": \"ListCreated\", \"Count\": 1}"
                    },
                    // Popülerlik Rozeti
                    new Achievement
                    {
                        Title = "Popular",
                        Description = "10 Takipçiye ulaştın.",
                        IconUrl = "/assets/badges/Popular.ico",
                        XpReward = 500,
                        CriteriaJson = "{\"Type\": \"FollowerGained\", \"Count\": 10}"
                    },
                    // Seviye Rozetleri
                    new Achievement { Title = "Level 1", Description = "Yolculuk başladı.", IconUrl = "/assets/badges/level_1.ico", XpReward = 0, CriteriaJson = "{\"Type\": \"LevelReached\", \"Target\": 1}" },
                    new Achievement { Title = "Level 2", Description = "Gelişmeye başladın.", IconUrl = "/assets/badges/level_2.ico", XpReward = 0, CriteriaJson = "{\"Type\": \"LevelReached\", \"Target\": 2}" },
                    new Achievement { Title = "Level 3", Description = "Artık buraları biliyorsun.", IconUrl = "/assets/badges/level_3.ico", XpReward = 0, CriteriaJson = "{\"Type\": \"LevelReached\", \"Target\": 3}" },
                    new Achievement { Title = "Level 4", Description = "Deneyim konuşuyor.", IconUrl = "/assets/badges/level_4.ico", XpReward = 0, CriteriaJson = "{\"Type\": \"LevelReached\", \"Target\": 4}" },
                    new Achievement { Title = "Level 5", Description = "Ustalık eserini veriyorsun.", IconUrl = "/assets/badges/level_5.ico", XpReward = 0, CriteriaJson = "{\"Type\": \"LevelReached\", \"Target\": 5}" },
                    new Achievement { Title = "Level 6", Description = "Adın efsaneler arasına yazıldı.", IconUrl = "/assets/badges/level_6.ico", XpReward = 0, CriteriaJson = "{\"Type\": \"LevelReached\", \"Target\": 6}" },
                    new Achievement { Title = "Level 7", Description = "Oyunun kurallarını sen yazıyorsun.", IconUrl = "/assets/badges/level_7.ico", XpReward = 0, CriteriaJson = "{\"Type\": \"LevelReached\", \"Target\": 7}" }
                };

                await context.Achievements.AddRangeAsync(achievements);
                await context.SaveChangesAsync();
            }
        }
    }
}