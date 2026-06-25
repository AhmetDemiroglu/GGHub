import { useQueryClient } from '@tanstack/react-query';
import { deleteList } from '@/src/api/list';
import type { Messages } from '@/src/i18n';
import type { ConfirmFn } from '@/src/components/common/ConfirmDialog';

type ToastFn = (type: 'success' | 'error' | 'info', title: string, message?: string) => void;

interface ShowDeleteListDialogParams {
  listId: number;
  listName: string;
  messages: Messages;
  queryClient: ReturnType<typeof useQueryClient>;
  showToast: ToastFn;
  confirm: ConfirmFn;
  onSuccess?: () => void;
}

export async function showDeleteListDialog({
  listId,
  listName,
  messages,
  queryClient,
  showToast,
  confirm,
  onSuccess,
}: ShowDeleteListDialogParams) {
  const ok = await confirm({
    title: messages.lists.deleteConfirmTitle,
    message: messages.lists.deleteConfirmMessage.replace('{name}', listName),
    confirmLabel: messages.common.delete,
    destructive: true,
  });
  if (!ok) return;

  try {
    await deleteList(listId);
    queryClient.invalidateQueries({ queryKey: ['myLists'] });
    showToast('success', messages.lists.deleteSuccess.replace('{name}', listName));
    onSuccess?.();
  } catch {
    showToast('error', messages.lists.deleteError);
  }
}
