namespace GGHub.Core.Enums
{
    /// <summary>
    /// Gonderi etiketinin hedef tipi. Token kisaltmalari ile birebir eslesir:
    /// User -> "u", Game -> "g", List -> "l" (bkz. MentionTokens).
    /// Istemci enum'lari bu degerleri aynaliyor, SONA eklenir.
    /// </summary>
    public enum MentionTargetType
    {
        User = 0,
        Game = 1,
        List = 2
    }
}
