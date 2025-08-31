'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Profile, ProfileVisibilitySetting } from '@/models/profile/profile.model';
import { updateProfileVisibility } from '@/api/profile/profile.api';
import { MessagePrivacySetting } from '@/models/profile/profile.model';
import { updateMessageSetting } from '@/api/profile/profile.api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/core/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/core/components/ui/radio-group';
import { Label } from '@/core/components/ui/label';

interface PrivacySettingsFormProps {
  initialData: Profile;
}

export function PrivacySettingsForm({ initialData }: PrivacySettingsFormProps) {
  const queryClient = useQueryClient();

  const { mutate: updateVisibility, isPending } = useMutation({
    mutationFn: updateProfileVisibility,
    onSuccess: () => {
      toast.success('Profil görünürlüğü güncellendi.');
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
    },
    onError: (error) => {
      toast.error('Bir hata oluştu.', { description: error.message });
    },
  });

  const handleVisibilityChange = (value: string) => {
    const newVisibility = Number(value) as ProfileVisibilitySetting;
    updateVisibility({ newVisibility });
  };

  const { mutate: updateMessage, isPending: isMessagePending } = useMutation({
    mutationFn: updateMessageSetting,
    onSuccess: () => {
      toast.success('Mesaj ayarları güncellendi.');
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
    },
    onError: (error) => {
      toast.error('Bir hata oluştu.', { description: error.message });
    },
  });


  const handleMessageSettingChange = (value: string) => {
    const newSetting = Number(value) as MessagePrivacySetting;
    updateMessage({ newSetting });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gizlilik Ayarları</CardTitle>
        <CardDescription>Profilinin kimler tarafından görüntülenebileceğini seç.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label className="font-semibold">Profil Görünürlüğü</Label>
          <RadioGroup
            defaultValue={String(initialData.profileVisibility)}
            onValueChange={handleVisibilityChange}
            disabled={isPending}
            className="mt-4 ml-2 space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem className='cursor-pointer' value={String(ProfileVisibilitySetting.Public)} id="public" />
              <Label htmlFor="public">Herkese Açık</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem className='cursor-pointer' value={String(ProfileVisibilitySetting.Followers)} id="followers" />
              <Label htmlFor="followers">Sadece Takipçiler</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem className='cursor-pointer' value={String(ProfileVisibilitySetting.Private)} id="private" />
              <Label htmlFor="private">Sadece Ben</Label>
            </div>
          </RadioGroup>
        </div>
        
        <div className="border-t pt-6">
          <Label className="font-semibold">Kimler Mesaj Atabilir?</Label>
          <RadioGroup
            defaultValue={String(initialData.messageSetting)}
            onValueChange={handleMessageSettingChange}
            disabled={isMessagePending}
            className="mt-4 ml-2 space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value={String(MessagePrivacySetting.Everyone)} id="msg-everyone" />
              <Label htmlFor="msg-everyone">Herkes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value={String(MessagePrivacySetting.Following)} id="msg-following" />
              <Label htmlFor="msg-following">Sadece Takip Ettiklerim</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value={String(MessagePrivacySetting.None)} id="msg-none" />
              <Label htmlFor="msg-none">Hiç Kimse</Label>
            </div>
          </RadioGroup>
        </div>
        
      </CardContent>
    </Card>
  );
}