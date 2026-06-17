import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';

const sections = [
  {
    titleEn: '1. Information We Collect',
    titleTr: '1. Toplad\u0131\u011F\u0131m\u0131z Bilgiler',
    contentEn: 'We collect information you provide directly, such as your name, email address, and profile information. We also collect usage data to improve our services.',
    contentTr: 'Ad\u0131n\u0131z, e-posta adresiniz ve profil bilgileriniz gibi do\u011Frudan sa\u011Flad\u0131\u011F\u0131n\u0131z bilgileri toplar\u0131z. Hizmetlerimizi iyile\u015Ftirmek i\u00E7in kullan\u0131m verilerini de toplar\u0131z.',
  },
  {
    titleEn: '2. How We Use Your Information',
    titleTr: '2. Bilgilerinizi Nas\u0131l Kullan\u0131r\u0131z',
    contentEn: 'We use your information to provide and improve our services, personalize your experience, communicate with you, and ensure platform security.',
    contentTr: 'Bilgilerinizi hizmetlerimizi sa\u011Flamak ve iyile\u015Ftirmek, deneyiminizi ki\u015Fiselle\u015Ftirmek, sizinle ileti\u015Fim kurmak ve platform g\u00FCvenli\u011Fini sa\u011Flamak i\u00E7in kullan\u0131r\u0131z.',
  },
  {
    titleEn: '3. Information Sharing',
    titleTr: '3. Bilgi Payla\u015F\u0131m\u0131',
    contentEn: 'We do not sell your personal information. We may share information with service providers who assist in operating our platform, subject to confidentiality agreements.',
    contentTr: 'Ki\u015Fisel bilgilerinizi satmay\u0131z. Gizlilik anla\u015Fmalar\u0131na tabi olarak platformumuzun i\u015Fletilmesine yard\u0131mc\u0131 olan hizmet sa\u011Flay\u0131c\u0131larla bilgi payla\u015Fabiliriz.',
  },
  {
    titleEn: '4. Data Security',
    titleTr: '4. Veri G\u00FCvenli\u011Fi',
    contentEn: 'We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, or destruction.',
    contentTr: 'Ki\u015Fisel bilgilerinizi yetkisiz eri\u015Fime, de\u011Fi\u015Fikli\u011Fe veya imhaya kar\u015F\u0131 korumak i\u00E7in uygun teknik ve organizasyonel \u00F6nlemler uygulamaktay\u0131z.',
  },
  {
    titleEn: '5. Your Rights',
    titleTr: '5. Haklar\u0131n\u0131z',
    contentEn: 'You have the right to access, correct, or delete your personal data. You can manage your privacy settings from your profile page.',
    contentTr: 'Ki\u015Fisel verilerinize eri\u015Fme, d\u00FCzeltme veya silme hakk\u0131na sahipsiniz. Gizlilik ayarlar\u0131n\u0131z\u0131 profil sayfan\u0131zdan y\u00F6netebilirsiniz.',
  },
  {
    titleEn: '6. Cookies',
    titleTr: '6. \u00C7erezler',
    contentEn: 'We use cookies and similar technologies to enhance your experience, analyze usage, and assist in our marketing efforts.',
    contentTr: 'Deneyiminizi geli\u015Ftirmek, kullan\u0131m\u0131 analiz etmek ve pazarlama \u00E7al\u0131\u015Fmalar\u0131m\u0131za yard\u0131mc\u0131 olmak i\u00E7in \u00E7erezler ve benzer teknolojiler kullan\u0131r\u0131z.',
  },
  {
    titleEn: '7. Contact',
    titleTr: '7. \u0130leti\u015Fim',
    contentEn: 'If you have questions about this Privacy Policy, please contact us at privacy@gghub.social.',
    contentTr: 'Bu Gizlilik Politikas\u0131 hakk\u0131nda sorular\u0131n\u0131z varsa l\u00FCtfen privacy@gghub.social adresinden bizimle ileti\u015Fime ge\u00E7in.',
  },
];

export default function PrivacyScreen() {
  const { colors } = useTheme();
  const { locale } = useLocale();
  const isTr = locale === 'tr';

  const pageTitle = isTr ? 'Gizlilik Politikas\u0131' : 'Privacy Policy';
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
