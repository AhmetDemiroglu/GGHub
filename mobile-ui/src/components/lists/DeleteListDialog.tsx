import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { deleteList } from '@/src/api/list';
import type { Messages } from '@/src/i18n';

type ToastFn = (type: 'success' | 'error' | 'info', title: string, message?: string) => void;

interface ShowDeleteListDialogParams {
  listId: number;
  listName: string;
  messages: Messages;
  queryClient: ReturnType<typeof useQueryClient>;
  showToast: ToastFn;
  onSuccess?: () => void;
}

export function showDeleteListDialog({
  listId,
  listName,
  messages,
  queryClient,
  showToast,
  onSuccess,
}: ShowDeleteListDialogParams) {
  Alert.alert(
    messages.lists.deleteConfirmTitle,
    messages.lists.deleteConfirmMessage.replace('{name}', listName),
    [
      { text: messages.common.cancel, style: 'cancel' },
      {
        text: messages.common.cancel === 'Cancel' ? 'Delete' : 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteList(listId);
            queryClient.invalidateQueries({ queryKey: ['myLists'] });
            showToast('success', messages.lists.deleteSuccess.replace('{name}', listName));
            onSuccess?.();
          } catch {
            showToast('error', messages.lists.deleteError);
          }
        },
      },
    ],
  );
}
