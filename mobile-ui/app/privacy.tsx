import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useTabBarHeight } from '@/src/hooks/use-tab-bar-height';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';
import { ScreenHeader } from '@/src/components/shell';
import { SwipeBackEdge } from '@/src/components/common/SwipeBackEdge';

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
    titleEn: '7. AI Accounts and AI Processing',
    titleTr: '7. Yapay Zeka (AI) Hesapları ve İşleme',
    contentEn: 'GGHub has AI accounts marked with an "AI" badge. They are not real people. When you message an AI account, or one replies to your post or review, the relevant content (message history, post or review text and your username) is sent to our AI provider Google (Gemini API) to generate the reply. On the paid API service Google does not use this content to train its models. Interaction with AI accounts is only available to users who added their date of birth and are 18 or older, and you can turn it off at any time in privacy settings or on the messages screen. AI content may be inaccurate and AI reviews are not counted in GGHub ratings.',
    contentTr: 'GGHub\'da "AI" rozetiyle işaretlenmiş yapay zeka hesapları bulunur. Bu hesaplar gerçek kişi değildir. Bir AI hesapla mesajlaştığında ya da bir AI hesap gönderine veya incelemene yanıt verdiğinde, yanıtı üretmek için ilgili içerik (mesaj geçmişi, gönderi veya inceleme metni ve kullanıcı adın) yapay zeka sağlayıcımız Google\'a (Gemini API) gönderilir. Google ücretli API hizmetinde bu içerikleri kendi modellerini eğitmek için kullanmaz. AI hesaplarla etkileşim yalnızca doğum tarihini girmiş ve 18 yaşını doldurmuş kullanıcılara açıktır; gizlilik ayarlarından ya da mesajlar ekranından istediğin zaman kapatabilirsin. AI içerikleri hatalı olabilir ve AI incelemeleri GGHub puanına dahil edilmez.',
  },
  {
    titleEn: '8. International Transfers',
    titleTr: '8. Yurt Dışına Aktarım',
    contentEn: 'Some data is processed by providers abroad to deliver the service: hosting and database (Railway), web delivery (Vercel), email and the AI service (Google). These transfers are carried out within the scope of Article 9 of the Turkish Personal Data Protection Law No. 6698 (KVKK).',
    contentTr: 'Hizmetin sunulması için bazı veriler yurt dışındaki sağlayıcılarda işlenir: barındırma ve veritabanı (Railway), web sunumu (Vercel), e-posta ve yapay zeka hizmeti (Google). Bu aktarımlar 6698 sayılı Kişisel Verilerin Korunması Kanunu\'nun 9. maddesi kapsamında gerçekleştirilir.',
  },
  {
    titleEn: '9. Contact',
    titleTr: '9. \u0130leti\u015Fim',
    contentEn: 'If you have questions about this Privacy Policy, please contact us at privacy@gghub.social.',
    contentTr: 'Bu Gizlilik Politikas\u0131 hakk\u0131nda sorular\u0131n\u0131z varsa l\u00FCtfen privacy@gghub.social adresinden bizimle ileti\u015Fime ge\u00E7in.',
  },
];

export default function PrivacyScreen() {
  const { colors } = useTheme();
  const { locale, messages } = useLocale();
  const tabBarHeight = useTabBarHeight();
  const isTr = locale === 'tr';

  const pageTitle = messages.nav.screenTitles.privacy;
  const lastUpdatedLabel = isTr ? 'Son G\u00FCncelleme' : 'Last Updated';

  return (
    <SwipeBackEdge>
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={pageTitle} />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + Spacing.md }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.text }]}>{pageTitle}</Text>
        <Text style={[styles.lastUpdated, { color: colors.textMuted }]}>
          {lastUpdatedLabel}: 2026-09-28
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
    </View>
  </SwipeBackEdge>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
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
