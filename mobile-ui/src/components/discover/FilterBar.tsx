import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  Modal,
  FlatList,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { FontSize, Spacing, BorderRadius } from '@/src/constants/theme';

interface FilterOption {
  label: string;
  value: string;
}

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedGenre: string;
  onGenreChange: (genre: string) => void;
  selectedPlatform: string;
  onPlatformChange: (platform: string) => void;
  selectedOrdering: string;
  onOrderingChange: (ordering: string) => void;
  genres: FilterOption[];
  platforms: FilterOption[];
}

function PickerModal({
  visible,
  onClose,
  title,
  options,
  selected,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: FilterOption[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          <FlatList
            data={options}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <Pressable
                style={[
                  styles.optionItem,
                  item.value === selected && { backgroundColor: `${colors.primary}15` },
                ]}
                onPress={() => {
                  onSelect(item.value);
                  onClose();
                }}
              >
                <Text
                  style={[
                    styles.optionText,
                    { color: item.value === selected ? colors.primary : colors.text },
                  ]}
                >
                  {item.label}
                </Text>
                {item.value === selected && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </Pressable>
            )}
          />
        </View>
      </Pressable>
    </Modal>
  );
}

export function FilterBar({
  searchQuery,
  onSearchChange,
  selectedGenre,
  onGenreChange,
  selectedPlatform,
  onPlatformChange,
  selectedOrdering,
  onOrderingChange,
  genres,
  platforms,
}: FilterBarProps) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const [activeModal, setActiveModal] = useState<'genre' | 'platform' | 'sort' | null>(null);

  const orderingOptions: FilterOption[] = [
    { label: messages.common.all, value: '' },
    { label: 'A-Z', value: 'name' },
    { label: 'Z-A', value: '-name' },
    { label: 'Metacritic', value: '-metacritic' },
    { label: messages.home?.trendingTitle ?? 'Trending', value: '-rating' },
  ];

  const allGenres: FilterOption[] = [
    { label: messages.common.all, value: '' },
    ...genres,
  ];

  const allPlatforms: FilterOption[] = [
    { label: messages.common.all, value: '' },
    ...platforms,
  ];

  const getSelectedLabel = (options: FilterOption[], value: string, defaultLabel: string) => {
    if (!value) return defaultLabel;
    return options.find((o) => o.value === value)?.label ?? defaultLabel;
  };

  return (
    <View style={styles.container}>
      <View style={[styles.searchRow, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
        <Ionicons name="search" size={18} color={colors.placeholder} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder={messages.discover.searchPlaceholder}
          placeholderTextColor={colors.placeholder}
          value={searchQuery}
          onChangeText={onSearchChange}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => onSearchChange('')}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersRow} contentContainerStyle={styles.filtersContent}>
        <Pressable
          style={[styles.filterChip, { backgroundColor: selectedGenre ? colors.primary : colors.surface, borderColor: colors.border }]}
          onPress={() => setActiveModal('genre')}
        >
          <Text style={[styles.chipText, { color: selectedGenre ? '#ffffff' : colors.text }]}>
            {getSelectedLabel(allGenres, selectedGenre, messages.discover.title)}
          </Text>
          <Ionicons name="chevron-down" size={14} color={selectedGenre ? '#ffffff' : colors.textMuted} />
        </Pressable>

        <Pressable
          style={[styles.filterChip, { backgroundColor: selectedPlatform ? colors.primary : colors.surface, borderColor: colors.border }]}
          onPress={() => setActiveModal('platform')}
        >
          <Text style={[styles.chipText, { color: selectedPlatform ? '#ffffff' : colors.text }]}>
            {getSelectedLabel(allPlatforms, selectedPlatform, 'Platform')}
          </Text>
          <Ionicons name="chevron-down" size={14} color={selectedPlatform ? '#ffffff' : colors.textMuted} />
        </Pressable>

        <Pressable
          style={[styles.filterChip, { backgroundColor: selectedOrdering ? colors.primary : colors.surface, borderColor: colors.border }]}
          onPress={() => setActiveModal('sort')}
        >
          <Text style={[styles.chipText, { color: selectedOrdering ? '#ffffff' : colors.text }]}>
            {getSelectedLabel(orderingOptions, selectedOrdering, messages.common.sortBy)}
          </Text>
          <Ionicons name="chevron-down" size={14} color={selectedOrdering ? '#ffffff' : colors.textMuted} />
        </Pressable>
      </ScrollView>

      <PickerModal
        visible={activeModal === 'genre'}
        onClose={() => setActiveModal(null)}
        title={messages.discover.title}
        options={allGenres}
        selected={selectedGenre}
        onSelect={onGenreChange}
      />
      <PickerModal
        visible={activeModal === 'platform'}
        onClose={() => setActiveModal(null)}
        title="Platform"
        options={allPlatforms}
        selected={selectedPlatform}
        onSelect={onPlatformChange}
      />
      <PickerModal
        visible={activeModal === 'sort'}
        onClose={() => setActiveModal(null)}
        title={messages.common.sortBy}
        options={orderingOptions}
        selected={selectedOrdering}
        onSelect={onOrderingChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: Spacing.sm,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    height: 44,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    height: '100%',
  },
  filtersRow: {
    marginTop: Spacing.sm,
  },
  filtersContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  chipText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '60%',
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingBottom: Spacing.xxxl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  optionText: {
    fontSize: FontSize.md,
  },
});
