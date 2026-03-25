"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Profile, ProfileVisibilitySetting, MessagePrivacySetting } from "@/models/profile/profile.model";
import { updateProfileVisibility, updateMessageSetting } from "@/api/profile/profile.api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/core/components/ui/radio-group";
import { Label } from "@/core/components/ui/label";
import { useI18n } from "@/core/contexts/locale-context";

interface PrivacySettingsFormProps {
    initialData: Profile;
}

export function PrivacySettingsForm({ initialData }: PrivacySettingsFormProps) {
    const t = useI18n();
    const queryClient = useQueryClient();

    const { mutate: updateVisibility, isPending } = useMutation({
        mutationFn: updateProfileVisibility,
        onSuccess: () => {
            toast.success(t("profile.privacy.successVisibility"));
            queryClient.invalidateQueries({ queryKey: ["my-profile"] });
        },
        onError: (error) => {
            toast.error(t("profile.privacy.error"), { description: error.message });
        },
    });

    const handleVisibilityChange = (value: string) => {
        const newVisibility = Number(value) as ProfileVisibilitySetting;
        updateVisibility({ newVisibility });
    };

    const { mutate: updateMessage, isPending: isMessagePending } = useMutation({
        mutationFn: updateMessageSetting,
        onSuccess: () => {
            toast.success(t("profile.privacy.successMessage"));
            queryClient.invalidateQueries({ queryKey: ["my-profile"] });
        },
        onError: (error) => {
            toast.error(t("profile.privacy.error"), { description: error.message });
        },
    });

    const handleMessageSettingChange = (value: string) => {
        const newSetting = Number(value) as MessagePrivacySetting;
        updateMessage({ newSetting });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("profile.privacy.title")}</CardTitle>
                <CardDescription>{t("profile.privacy.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <Label className="font-semibold">{t("profile.privacy.profileVisibilityTitle")}</Label>
                    <RadioGroup
                        defaultValue={String(initialData.profileVisibility)}
                        onValueChange={handleVisibilityChange}
                        disabled={isPending}
                        className="mt-4 ml-2 space-y-2"
                    >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem className="cursor-pointer" value={String(ProfileVisibilitySetting.Public)} id="public" />
                            <Label htmlFor="public">{t("profile.privacy.public")}</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem className="cursor-pointer" value={String(ProfileVisibilitySetting.Followers)} id="followers" />
                            <Label htmlFor="followers">{t("profile.privacy.followersOnly")}</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem className="cursor-pointer" value={String(ProfileVisibilitySetting.Private)} id="private" />
                            <Label htmlFor="private">{t("profile.privacy.private")}</Label>
                        </div>
                    </RadioGroup>
                </div>

                <div className="border-t pt-6">
                    <Label className="font-semibold">{t("profile.privacy.messageSettingsTitle")}</Label>
                    <RadioGroup
                        defaultValue={String(initialData.messageSetting)}
                        onValueChange={handleMessageSettingChange}
                        disabled={isMessagePending}
                        className="mt-4 ml-2 space-y-2"
                    >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value={String(MessagePrivacySetting.Everyone)} id="msg-everyone" />
                            <Label htmlFor="msg-everyone">{t("profile.privacy.everyone")}</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value={String(MessagePrivacySetting.Following)} id="msg-following" />
                            <Label htmlFor="msg-following">{t("profile.privacy.following")}</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value={String(MessagePrivacySetting.None)} id="msg-none" />
                            <Label htmlFor="msg-none">{t("profile.privacy.none")}</Label>
                        </div>
                    </RadioGroup>
                </div>
            </CardContent>
        </Card>
    );
}
