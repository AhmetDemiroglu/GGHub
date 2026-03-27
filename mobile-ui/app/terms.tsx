import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';

const sections = [
  {
    titleEn: '1. Acceptance of Terms',
    titleTr: '1. Ko\u015Fullar\u0131n Kabul\u00FC',
    contentEn: 'By accessing and using GGHub, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the platform.',
    contentTr: "GGHub'a eri\u015Ferek ve kullanarak bu Kullan\u0131m Ko\u015Fullar\u0131na ba\u011Fl\u0131 olmay\u0131 kabul edersiniz. Bu ko\u015Fullar\u0131 kabul etmiyorsan\u0131z l\u00FCtfen platformu kullanmay\u0131n.",
  },
  {
    titleEn: '2. User Accounts',
    titleTr: '2. Kullan\u0131c\u0131 Hesaplar\u0131',
    contentEn: 'You are responsible for maintaining the confidentiality of your account credentials. You agree to provide accurate and complete information when creating your account and to keep this information up to date.',
    contentTr: 'Hesap bilgilerinizin gizlili\u011Fini korumak sizin sorumlulu\u011Funuzdad\u0131r. Hesap olu\u015Ftururken do\u011Fru ve eksiksiz bilgi vermeyi ve bu bilgileri g\u00FCncel tutmay\u0131 kabul edersiniz.',
  },
  {
    titleEn: '3. User Content',
    titleTr: '3. Kullan\u0131c\u0131 \u0130\u00E7eri\u011Fi',
    contentEn: 'You retain ownership of the content you create on GGHub, including reviews, lists, and comments. By posting content, you grant GGHub a non-exclusive license to display and distribute your content within the platform.',
    contentTr: "\u0130ncelemeler, listeler ve yorumlar dahil GGHub'da olu\u015Fturdu\u011Funuz i\u00E7eri\u011Fin m\u00FClkiyeti size aittir. \u0130\u00E7erik yay\u0131nlayarak, GGHub'a platform i\u00E7inde i\u00E7eri\u011Finizi g\u00F6r\u00FCnt\u00FCleme ve da\u011F\u0131tma konusunda m\u00FCnhas\u0131r olmayan bir lisans verirsiniz.",
  },
  {
    titleEn: '4. Prohibited Conduct',
    titleTr: '4. Yasak Davran\u0131\u015Flar',
    contentEn: 'Users must not engage in harassment, spam, hate speech, or any illegal activities on the platform. Violations may result in account suspension or termination.',
    contentTr: 'Kullan\u0131c\u0131lar platformda taciz, spam, nefret s\u00F6ylemi veya herhangi bir yasad\u0131\u015F\u0131 faaliyette bulunmamal\u0131d\u0131r. \u0130hlaller hesap ask\u0131ya alma veya fesih ile sonu\u00E7lanabilir.',
  },
  {
    titleEn: '5. Privacy',
    titleTr: '5. Gizlilik',
    contentEn: 'Your privacy is important to us. Please review our Privacy Policy to understand how we collect, use, and protect your personal information.',
    contentTr: 'Gizlili\u011Finiz bizim i\u00E7in \u00F6nemlidir. Ki\u015Fisel bilgilerinizi nas\u0131l toplad\u0131\u011F\u0131m\u0131z\u0131, kulland\u0131\u011F\u0131m\u0131z\u0131 ve korudu\u011Fumuzu anlamak i\u00E7in l\u00FCtfen Gizlilik Politikam\u0131z\u0131 inceleyin.',
  },
  {
    titleEn: '6. Modifications',
    titleTr: '6. De\u011Fi\u015Fiklikler',
    contentEn: 'GGHub reserves the right to modify these terms at any time. Continued use of the platform after changes constitutes acceptance of the new terms.',
    contentTr: 'GGHub bu ko\u015Fullar\u0131 herhangi bir zamanda de\u011Fi\u015Ftirme hakk\u0131n\u0131 sakl\u0131 tutar. De\u011Fi\u015Fikliklerden sonra platformu kullanmaya devam etmeniz yeni ko\u015Fullar\u0131n kabul\u00FC anlam\u0131na gelir.',
  },
  {
    titleEn: '7. Contact',
    titleTr: '7. \u0130leti\u015Fim',
    contentEn: 'If you have questions about these Terms of Service, please contact us at support@gghub.social.',
    contentTr: 'Bu Kullan\u0131m Ko\u015Fullar\u0131 hakk\u0131nda sorular\u0131n\u0131z varsa l\u00FCtfen support@gghub.social adresinden bizimle ileti\u015Fime ge\u00E7in.',
  },
];

export default function TermsScreen() {
  const { colors } = useTheme();
  const { locale } = useLocale();
  const isTr = locale === 'tr';

  const pageTitle = isTr ? 'Kullan\u0131m Ko\u015Fullar\u0131' : 'Terms of Service';
  const lastUpdatedLabel = isTr ? 'Son G\u00FCncelleme' : 'Last Updated';

  return (
    <>
      <Stack.Screen options={{ title: pageTitle, headerShown: true }} />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.text }]}>{pageTitle}</Text>
        <Text style={[styles.lastUpdated, { color: colors.textMuted }]}>
          {lastUpdatedLabel}: 2026-01-01
        </Text>

        {sections.map((section, index) => (
          <View
            key={index}
            style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {isTr ? section.titleTr : section.titleEn}
            </Text>
            <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>
              {isTr ? section.contentTr : section.contentEn}
            </Text>
          </View>
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing.xxxl,
  },
  title: {
    fontSize: FontSize.xxxl,
    fontWeight: '700',
  },
  lastUpdated: {
    fontSize: FontSize.sm,
    marginBottom: Spacing.md,
  },
  section: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  sectionContent: {
    fontSize: FontSize.md,
    lineHeight: 24,
  },
});
