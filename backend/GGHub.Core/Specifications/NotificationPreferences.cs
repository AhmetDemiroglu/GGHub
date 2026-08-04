using System;
using System.Collections.Generic;
using System.Linq;
using GGHub.Core.Enums;

namespace GGHub.Core.Specifications
{
    /// <summary>
    /// Hangi bildirim tiplerinin kullanıcı tarafından kapatılabildiğinin TEK kaynağı.
    ///
    /// Liste enum'dan türetiliyor: <see cref="NotificationType"/>'a yeni bir tip eklendiğinde
    /// ayarlar ekranında kendiliğinden görünür, elle güncellenecek ikinci bir liste yok.
    /// </summary>
    public static class NotificationPreferences
    {
        /// <summary>
        /// Doğum günü DIŞINDAKİ tüm tipler, enum sırasıyla.
        ///
        /// Doğum günü kapsam dışı: yılda bir kez gelir, aktörü yoktur ve kullanıcıyı rahatsız
        /// eden bir gürültü kaynağı değil; kapatılabilir yapmak ayarı gereksiz kalabalıklaştırır.
        /// </summary>
        public static readonly IReadOnlyList<NotificationType> Configurable =
            Enum.GetValues<NotificationType>()
                .Where(type => type != NotificationType.Birthday)
                .ToArray();

        /// <summary>Tip kullanıcı tercihine tabi mi? Değilse bildirim her zaman gönderilir.</summary>
        public static bool IsConfigurable(NotificationType type) => type != NotificationType.Birthday;
    }
}
