import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from '@/src/components/common/BottomSheet';
import { Button } from '@/src/components/common/Button';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';

const ROW_HEIGHT = 44;
const LIST_HEIGHT = ROW_HEIGHT * 5;
const OLDEST_YEAR_OFFSET = 100;

interface DateFieldProps {
  label?: string;
  /** ISO tarih ("2000-07-18T00:00:00.000Z") ya da null. */
  value: string | null;
  onChange: (isoDate: string | null) => void;
  placeholder?: string;
}

/** Verilen ay/yil kac gun cekiyor. Subat ve artik yil dahil dogru. */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** ISO metinden yerel gun/ay/yil parcalari. UTC'den okunur (yazarken de UTC yaziyoruz). */
function partsFromIso(iso: string | null): { day: number; month: number; year: number } | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return { day: date.getUTCDate(), month: date.getUTCMonth() + 1, year: date.getUTCFullYear() };
}

/**
 * Dogum tarihi alani. Yeni bir native bagimlilik EKLEMEZ (takvim paketi eklemek
 * yeni bir native build ve pod/gradle isi cikarirdi); mevcut BottomSheet icinde
 * gun / ay / yil olmak uzere uc sutunlu saf JS bir secici gosterir.
 *
 * Ureilen deger DAIMA o gunun 00:00 UTC'sidir. Backend dogum gunu esleşmesini
 * (BirthdayCalendar.MonthDay) UTC'den okudugu icin bu sart: yerel gece yarisi
 * yazilsaydi negatif offsetli cihazlarda tarih bir gun kayardi.
 */
export function DateField({ label, value, onChange, placeholder }: DateFieldProps) {
  const { colors } = useTheme();
  const { messages, locale } = useLocale();
  const ef = messages.profile.editForm;

  const [open, setOpen] = useState(false);
  const currentYear = new Date().getFullYear();

  const selected = partsFromIso(value);
  const [day, setDay] = useState(selected?.day ?? 1);
  const [month, setMonth] = useState(selected?.month ?? 1);
  const [year, setYear] = useState(selected?.year ?? currentYear - 20);

  const dayRef = useRef<ScrollView>(null);
  const monthRef = useRef<ScrollView>(null);
  const yearRef = useRef<ScrollView>(null);

  const years = useMemo(
    () => Array.from({ length: OLDEST_YEAR_OFFSET + 1 }, (_, i) => currentYear - i),
    [currentYear],
  );

  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        value: i + 1,
        label: new Date(2000, i, 1).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US', {
          month: 'long',
        }),
      })),
    [locale],
  );

  const maxDay = daysInMonth(year, month);
  const days = useMemo(() => Array.from({ length: maxDay }, (_, i) => i + 1), [maxDay]);

  // 31 Mart secilip Subat'a gecilirse gun gecersiz kalir; ayin son gunune cek.
  useEffect(() => {
    if (day > maxDay) setDay(maxDay);
  }, [day, maxDay]);

  // Sheet acilinca secili degerleri gorunur kil.
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      dayRef.current?.scrollTo({ y: Math.max(0, (day - 3) * ROW_HEIGHT), animated: false });
      monthRef.current?.scrollTo({ y: Math.max(0, (month - 3) * ROW_HEIGHT), animated: false });
      yearRef.current?.scrollTo({
        y: Math.max(0, (years.indexOf(year) - 2) * ROW_HEIGHT),
        animated: false,
      });
    }, 120);
    return () => clearTimeout(timer);
  }, [open, day, month, year, years]);

  const openSheet = () => {
    const current = partsFromIso(value);
    if (current) {
      setDay(current.day);
      setMonth(current.month);
      setYear(current.year);
    }
    setOpen(true);
  };

  const confirm = () => {
    const safeDay = Math.min(day, daysInMonth(year, month));
    onChange(new Date(Date.UTC(year, month - 1, safeDay)).toISOString());
    setOpen(false);
  };

  const clear = () => {
    onChange(null);
    setOpen(false);
  };

  const display = selected
    ? new Date(Date.UTC(selected.year, selected.month - 1, selected.day)).toLocaleDateString(
        locale === 'tr' ? 'tr-TR' : 'en-US',
        { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' },
      )
    : null;

  const renderColumn = (
    ref: React.RefObject<ScrollView | null>,
    items: { value: number; label: string }[],
    active: number,
    onSelect: (v: number) => void,
  ) => (
    <ScrollView
      ref={ref}
      style={styles.column}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingVertical: ROW_HEIGHT }}
    >
      {items.map((item) => {
        const isActive = item.value === active;
        return (
          <Pressable
            key={item.value}
            onPress={() => onSelect(item.value)}
            style={[
              styles.row,
              isActive && { backgroundColor: colors.primary + '22', borderRadius: BorderRadius.md },
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.rowText,
                { color: isActive ? colors.primary : colors.textSecondary },
                isActive && styles.rowTextActive,
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {label ? <Text style={[styles.label, { color: colors.text }]}>{label}</Text> : null}

      <Pressable
        onPress={openSheet}
        accessibilityRole="button"
        style={[
          styles.field,
          { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
        ]}
      >
        <Ionicons name="calendar-outline" size={20} color={colors.placeholder} />
        <Text
          style={[styles.fieldText, { color: display ? colors.text : colors.placeholder }]}
          numberOfLines={1}
        >
          {display ?? placeholder ?? ef.dateOfBirthPlaceholder}
        </Text>
        {display ? (
          <Pressable
            onPress={clear}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={ef.dateOfBirthClear}
          >
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </Pressable>

      <BottomSheet visible={open} onClose={() => setOpen(false)} title={ef.dateOfBirth}>
        <View style={styles.columns}>
          {renderColumn(
            dayRef,
            days.map((d) => ({ value: d, label: String(d) })),
            day,
            setDay,
          )}
          {renderColumn(monthRef, months, month, setMonth)}
          {renderColumn(
            yearRef,
            years.map((y) => ({ value: y, label: String(y) })),
            year,
            setYear,
          )}
        </View>

        <View style={styles.actions}>
          <Button title={ef.dateOfBirthClear} onPress={clear} variant="secondary" style={styles.actionBtn} />
          <Button title={ef.dateOfBirthDone} onPress={confirm} style={styles.actionBtn} />
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: FontSize.md,
    fontWeight: '500',
    marginBottom: Spacing.sm,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  fieldText: {
    flex: 1,
    fontSize: FontSize.md,
  },
  columns: {
    flexDirection: 'row',
    gap: Spacing.sm,
    height: LIST_HEIGHT,
    marginBottom: Spacing.lg,
  },
  column: {
    flex: 1,
  },
  row: {
    height: ROW_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
  },
  rowText: {
    fontSize: FontSize.md,
  },
  rowTextActive: {
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  actionBtn: {
    flex: 1,
  },
});
