"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/core/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/core/components/ui/form";
import { Input } from "@/core/components/ui/input";
import { Textarea } from "@/core/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card";
import { Switch } from "@/core/components/ui/switch";
import { DatePicker } from "@/core/components/ui/date-picker";
import { PrivacySettingsForm } from "@/core/components/other/privacy-settings-form";
import { useI18n } from "@/core/contexts/locale-context";
import { Profile } from "@/models/profile/profile.model";
import { updateMyProfile } from "@/api/profile/profile.api";

interface ProfileEditFormProps {
    initialData: Profile;
    onSave: () => void;
}

export function ProfileEditForm({ initialData, onSave }: ProfileEditFormProps) {
    const t = useI18n();
    const queryClient = useQueryClient();

    const formSchema = z.object({
        firstName: z.string().nullable(),
        lastName: z.string().nullable(),
        bio: z.string().nullable(),
        isEmailPublic: z.boolean(),
        isPhoneNumberPublic: z.boolean(),
        isDateOfBirthPublic: z.boolean(),
        phoneNumber: z.string().nullable(),
        dateOfBirth: z.date().nullable(),
        status: z.string().nullable(),
        profileImageUrl: z.string().nullable(),
    });

    type FormData = z.infer<typeof formSchema>;

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            firstName: initialData.firstName || "",
            lastName: initialData.lastName || "",
            bio: initialData.bio || "",
            isEmailPublic: initialData.isEmailPublic ?? false,
            isPhoneNumberPublic: initialData.isPhoneNumberPublic ?? false,
            isDateOfBirthPublic: initialData.isDateOfBirthPublic ?? false,
            phoneNumber: initialData.phoneNumber || "",
            dateOfBirth: initialData.dateOfBirth ? new Date(initialData.dateOfBirth) : null,
            status: initialData.status || "",
            profileImageUrl: initialData.profileImageUrl || null,
        },
    });

    const { mutate, isPending } = useMutation({
        mutationFn: updateMyProfile,
        onSuccess: () => {
            toast.success(t("profile.editForm.success"));
            queryClient.invalidateQueries({ queryKey: ["my-profile"] });
            onSave();
        },
        onError: (error) => {
            toast.error(t("profile.editForm.error"), {
                description: error.message,
            });
        },
    });

    useEffect(() => {
        form.reset({
            firstName: initialData.firstName || "",
            lastName: initialData.lastName || "",
            bio: initialData.bio || "",
            isEmailPublic: !!initialData.isEmailPublic,
            isPhoneNumberPublic: !!initialData.isPhoneNumberPublic,
            isDateOfBirthPublic: !!initialData.isDateOfBirthPublic,
            phoneNumber: initialData.phoneNumber || "",
            dateOfBirth: initialData.dateOfBirth ? new Date(initialData.dateOfBirth) : null,
            status: initialData.status || "",
            profileImageUrl: initialData.profileImageUrl || null,
        });
    }, [initialData, form]);

    function onSubmit(values: FormData) {
        const { dateOfBirth } = values;
        const correctedValues = { ...values };

        if (dateOfBirth) {
            const userTimezoneOffset = dateOfBirth.getTimezoneOffset() * 60000;
            const correctedDate = new Date(dateOfBirth.getTime() - userTimezoneOffset);
            correctedValues.dateOfBirth = correctedDate;
        }

        mutate(correctedValues);
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("profile.editForm.title")}</CardTitle>
                <CardDescription>{t("profile.editForm.description")}</CardDescription>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="firstName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("profile.editForm.firstName")}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t("profile.editForm.firstNamePlaceholder")} {...field} value={field.value ?? ""} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="lastName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("profile.editForm.lastName")}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t("profile.editForm.lastNamePlaceholder")} {...field} value={field.value ?? ""} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("profile.editForm.status")}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t("profile.editForm.statusPlaceholder")} {...field} value={field.value ?? ""} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="dateOfBirth"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>{t("profile.editForm.dateOfBirth")}</FormLabel>
                                    <FormControl>
                                        <DatePicker date={field.value} onDateChange={field.onChange} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="isDateOfBirthPublic"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel>{t("profile.editForm.showDateOfBirth")}</FormLabel>
                                        <FormDescription>{t("profile.editForm.showDateOfBirthDescription")}</FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch checked={field.value} onCheckedChange={field.onChange} className="cursor-pointer" />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="bio"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("profile.editForm.bio")}</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder={t("profile.editForm.bioPlaceholder")} className="resize-none" {...field} value={field.value ?? ""} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="phoneNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("profile.editForm.phoneNumber")}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t("profile.editForm.phoneNumberPlaceholder")} {...field} value={field.value ?? ""} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="isPhoneNumberPublic"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel>{t("profile.editForm.showPhoneNumber")}</FormLabel>
                                        <FormDescription>{t("profile.editForm.showPhoneNumberDescription")}</FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch checked={field.value} onCheckedChange={field.onChange} className="cursor-pointer" />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="isEmailPublic"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel>{t("profile.editForm.showEmail")}</FormLabel>
                                        <FormDescription>{t("profile.editForm.showEmailDescription")}</FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch checked={field.value} onCheckedChange={field.onChange} className="cursor-pointer" />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <PrivacySettingsForm initialData={initialData} />

                        <Button className="cursor-pointer" type="submit" disabled={isPending}>
                            {isPending ? t("profile.editForm.saving") : t("profile.editForm.save")}
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
