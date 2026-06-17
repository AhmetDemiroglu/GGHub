import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';
import { Card } from '@/src/components/common/Card';

export default function AboutScreen() {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const m = messages.about;

  const features: { icon: keyof typeof Ionicons.glyphMap; title: string; description: string; color: string }[] = [
    {
      icon: 'search',
      title: m.discoverTitle,
      description: m.discoverDescription,
      color: colors.primary,
    },
    {
      icon: 'list',
      title: m.listTitle,
      description: m.listDescription,
      color: colors.success,
    },
    {
      icon: 'people',
      title: m.connectTitle,
      description: m.connectDescription,
      color: colors.warning,
    },
  ];

  const steps: { number: string; title: string; description: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
    {
      number: '1',
      title: m.step1Title,
      description: m.step1Description,
      icon: 'person-add',
      color: colors.primary,
    },
    {
      number: '2',
      title: m.step2Title,
      description: m.step2Description,
      icon: 'game-controller',
      color: colors.success,
    },
    {
      number: '3',
      title: m.step3Title,
      description: m.step3Description,
      icon: 'share-social',
      color: colors.warning,
    },
  ];

  return (
    <>
      <Stack.Screen options={{ title: m.title, headerShown: true }} />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, { backgroundColor: colors.primary + '10' }]}>
          <Ionicons name="game-controller" size={48} color={colors.primary} />
          <Text style={[styles.heroTitle, { color: colors.text }]}>{m.title}</Text>
          <Text style={[styles.heroDescription, { color: colors.textSecondary }]}>
            {m.subtitle}
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>{m.badge}</Text>
        {features.map((feature) => (
          <Card key={feature.title} style={styles.featureCard}>
            <View style={styles.featureRow}>
              <View style={[styles.featureIcon, { backgroundColor: feature.color + '20' }]}>
                <Ionicons name={feature.icon} size={24} color={feature.color} />
              </View>
              <View style={styles.featureContent}>
                <Text style={[styles.featureTitle, { color: colors.text }]}>{feature.title}</Text>
                <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
                  {feature.description}
                </Text>
              </View>
            </View>
          </Card>
        ))}

        <View style={[styles.whySection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="heart" size={32} color={colors.error} />
          <Text style={[styles.whyTitle, { color: colors.text }]}>{m.whyTitle}</Text>
          <Text style={[styles.whyDescription, { color: colors.textSecondary }]}>
            {m.whyDescription}
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>{m.howTitle}</Text>
        {steps.map((step) => (
          <View
            key={step.number}
            style={[styles.stepCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={[styles.stepNumber, { backgroundColor: step.color }]}>
              <Text style={styles.stepNumberText}>{step.number}</Text>
            </View>
            <View style={styles.stepContent}>
              <View style={styles.stepTitleRow}>
                <Ionicons name={step.icon} size={20} color={step.color} />
                <Text style={[styles.stepTitle, { color: colors.text }]}>{step.title}</Text>
              </View>
              <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
                {step.description}
              </Text>
            </View>
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
  hero: {
    alignItems: 'center',
    padding: Spacing.xxl,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  heroTitle: {
    fontSize: FontSize.xxxl,
    fontWeight: '700',
    textAlign: 'center',
  },
  heroDescription: {
    fontSize: FontSize.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  featureCard: {
    marginBottom: 0,
  },
  featureRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  featureDescription: {
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  whySection: {
    alignItems: 'center',
    padding: Spacing.xxl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  whyTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    textAlign: 'center',
  },
  whyDescription: {
    fontSize: FontSize.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  stepCard: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    color: '#ffffff',
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  stepContent: {
    flex: 1,
  },
  stepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  stepTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  stepDescription: {
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
});
