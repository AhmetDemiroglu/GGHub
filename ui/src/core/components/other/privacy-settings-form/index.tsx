'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Profile, ProfileVisibilitySetting } from '@/models/profile/profile.model';
import { updateProfileVisibility } from '@/api/profile/profile.api';

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
        
        {/* E-posta ve Telefon Numarası için Switch'ler buraya gelecek */}
        
      </CardContent>
    </Card>
  );
}