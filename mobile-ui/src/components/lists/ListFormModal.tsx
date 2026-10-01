import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { Input } from '@/src/components/common/Input';
import { Button } from '@/src/components/common/Button';
import { BottomSheet, BottomSheetScrollView } from '@/src/components/common/BottomSheet';
import { useToast } from '@/src/components/common/Toast';
import { createList, updateList } from '@/src/api/list';
import {
  ListVisibilitySetting, ListCategory,
  type UserList, type UserListForCreation, type UserListForUpdate,
} from '@/src/models/list';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';
import { invalidateListSummaries } from '@/src/utils/query-invalidation';

interface ListFormModalProps {
  visible: boolean;
  onClose: () => void;
  editingList?: UserList | null;
}

const visibilityOptions = [
  { value: ListVisibilitySetting.Public, labelKey: 'public' as const },
  { value: ListVisibilitySetting.Followers, labelKey: 'followers' as const },
  { value: ListVisibilitySetting.Private, labelKey: 'private' as const },
];

const categoryOptions = [
  { value: ListCategory.Other, labelKey: 'other' as const },
  { value: ListCategory.Action, labelKey: 'action' as const },
  { value: ListCategory.RPG, labelKey: 'rpg' as const },
  { value: ListCategory.Strategy, labelKey: 'strategy' as const },
  { value: ListCategory.Shooter, labelKey: 'shooter' as const },
  { value: ListCategory.Adventure, labelKey: 'adventure' as const },
  { value: ListCategory.Simulation, labelKey: 'simulation' as const },
  { value: ListCategory.Sports, labelKey: 'sports' as const },
  { value: ListCategory.Puzzle, labelKey: 'puzzle' as const },
  { value: ListCategory.Horror, labelKey: 'horror' as const },
];

export function ListFormModal({ visible, onClose, editingList: editingListProp }: ListFormModalProps) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  // Ust bilesen kapatirken editingList'i hemen null yapiyor. Pencere kapanis
  // animasyonu boyunca acik oldugu haliyle kalsin: baslik "Yeni Liste"ye
  // donmesin, form bosalmasin. Yalnizca acikken gelen deger alinir.
  const editingRef = useRef(editingListProp);
  if (visible) editingRef.current = editingListProp;
  const editingList = editingRef.current;
  const isEditing = !!editingList;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<ListVisibilitySetting>(ListVisibilitySetting.Public);
  const [category, setCategory] = useState<ListCategory>(ListCategory.Other);

  useEffect(() => {
    if (!visible) return;
    if (editingList) {
      setName(editingList.name);
      setDescription(editingList.description ?? '');
      setVisibility(editingList.visibility);
      setCategory(editingList.category);
    } else {
      setName('');
      setDescription('');
      setVisibility(ListVisibilitySetting.Public);
      setCategory(ListCategory.Other);
    }
    // id'ye bagli: liste detayi arkada tazelenince (yeni nesne) yazilanlar silinmesin.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingList?.id, visible]);

  const createMutation = useMutation({
    mutationFn: (data: UserListForCreation) => createList(data),
    onSuccess: (result) => {
      invalidateListSummaries(queryClient);
      showToast('success', messages.lists.createSuccess.replace('{name}', result.name));
      onClose();
    },
    onError: () => {
      showToast('error', messages.lists.createError);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: UserListForUpdate) => updateList(editingList!.id, data),
    onSuccess: () => {
      invalidateListSummaries(queryClient);
      queryClient.invalidateQueries({ queryKey: ['listDetail'] });
      showToast('success', messages.lists.updateSuccess.replace('{name}', name));
      onClose();
    },
    onError: () => {
      showToast('error', messages.lists.updateError);
    },
  });

  const handleSubmit = () => {
    if (!name.trim()) return;
    const data = {
      name: name.trim(),
      description: description.trim() || undefined,
      visibility,
      category,
    };
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const visibilityLabels: Record<string, string> = {
    public: messages.lists.public,
    followers: messages.lists.followers,
    private: messages.lists.private,
  };

  return (
    // Diger tum alt pencerelerle ayni kabuk (BottomSheet): ayni tutamak, baslik,
    // kose ve cekip kapatma. Eskiden iOS pageSheet + elle cizilmis baslik/X
    // kullaniyordu; ust kenar digerlerinden farkli ve asimetrik duruyordu.
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={isEditing ? messages.lists.formEditTitle : messages.lists.formCreateTitle}
      footer={
        <Button
          title={isLoading ? messages.lists.formSaving : messages.common.save}
          onPress={handleSubmit}
          loading={isLoading}
          disabled={!name.trim()}
        />
      }
    >
      <BottomSheetScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.bodyContent}
      >
        <Input
          label={messages.lists.formName}
          placeholder={messages.lists.formNamePlaceholder}
          value={name}
          onChangeText={setName}
          maxLength={100}
        />

        <Input
          label={messages.lists.formDescription}
          placeholder={messages.lists.formDescriptionPlaceholder}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          style={styles.textArea}
          maxLength={500}
        />

        <Text style={[styles.sectionLabel, { color: colors.text }]}>
          {messages.lists.formVisibility}
        </Text>
        <View style={styles.optionsRow}>
          {visibilityOptions.map((opt) => (
            <Pressable
              key={opt.value}
              style={[
                styles.optionChip,
                {
                  backgroundColor: visibility === opt.value ? colors.primary : colors.surface,
                  borderColor: visibility === opt.value ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setVisibility(opt.value)}
            >
              <Text
                style={[
                  styles.optionChipText,
                  { color: visibility === opt.value ? '#ffffff' : colors.text },
                ]}
              >
                {visibilityLabels[opt.labelKey]}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.sectionLabel, { color: colors.text }]}>
          {messages.lists.formCategory}
        </Text>
        <View style={styles.optionsRow}>
          {categoryOptions.map((opt) => (
            <Pressable
              key={opt.value}
              style={[
                styles.optionChip,
                {
                  backgroundColor: category === opt.value ? colors.primary : colors.surface,
                  borderColor: category === opt.value ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setCategory(opt.value)}
            >
              <Text
                style={[
                  styles.optionChipText,
                  { color: category === opt.value ? '#ffffff' : colors.text },
                ]}
              >
                {messages.lists.categories[opt.labelKey]}
              </Text>
            </Pressable>
          ))}
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  // Yatay bosluk pencerenin kendisinden gelir (BottomSheet paddingHorizontal).
  bodyContent: { paddingTop: Spacing.xs },
  textArea: { height: 80, textAlignVertical: 'top' },
  sectionLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  optionChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  optionChipText: { fontSize: FontSize.sm, fontWeight: '500' },
});
