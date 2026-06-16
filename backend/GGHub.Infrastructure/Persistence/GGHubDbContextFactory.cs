using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace GGHub.Infrastructure.Persistence
{
    // Used ONLY by EF Core tooling (dotnet ef migrations add/script). Having this factory
    // makes the tools instantiate the DbContext directly instead of booting the full WebAPI
    // host — which would otherwise run the startup seeding block against the live database.
    // "migrations add" / "migrations script" never open a connection, so the placeholder
    // connection string below is never used to connect (and deliberately points nowhere real).
    public class GGHubDbContextFactory : IDesignTimeDbContextFactory<GGHubDbContext>
    {
        public GGHubDbContext CreateDbContext(string[] args)
        {
            var optionsBuilder = new DbContextOptionsBuilder<GGHubDbContext>();
            optionsBuilder.UseNpgsql("Host=localhost;Port=5432;Database=gghub_designtime;Username=postgres;Password=postgres");
            return new GGHubDbContext(optionsBuilder.Options);
        }
    }
}
