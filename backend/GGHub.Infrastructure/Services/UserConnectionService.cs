using System.Collections.Concurrent;
using GGHub.Application.Interfaces;

namespace GGHub.Infrastructure.Services
{
    public class UserConnectionService : IUserConnectionService
    {
        private readonly ConcurrentDictionary<int, HashSet<string>> _userConnections = new();
        private readonly ConcurrentDictionary<string, int> _connectionUsers = new();
        private readonly object _lock = new();

        public void AddConnection(int userId, string connectionId)
        {
            lock (_lock)
            {
                _connectionUsers[connectionId] = userId;

                var connections = _userConnections.GetOrAdd(userId, _ => new HashSet<string>());
                connections.Add(connectionId);
            }
        }

        public void RemoveConnection(string connectionId)
        {
            lock (_lock)
            {
                if (_connectionUsers.TryRemove(connectionId, out var userId))
                {
                    if (_userConnections.TryGetValue(userId, out var connections))
                    {
                        connections.Remove(connectionId);
                        if (connections.Count == 0)
                        {
                            _userConnections.TryRemove(userId, out _);
                        }
                    }
                }
            }
        }

        public IReadOnlyList<string> GetConnections(int userId)
        {
            lock (_lock)
            {
                if (_userConnections.TryGetValue(userId, out var connections))
                {
                    return connections.ToList().AsReadOnly();
                }
                return Array.Empty<string>();
            }
        }

        public bool IsUserOnline(int userId)
        {
            return _userConnections.ContainsKey(userId) &&
                   _userConnections[userId].Count > 0;
        }
    }
}
