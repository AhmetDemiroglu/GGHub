"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import * as z from "zod";
import { Profile } from "@/models/profile/profile.model";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateMyProfile } from "@/api/profile/profile.api";
import { toast } from "sonner";
import { Button } from "@/core/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/core/components/ui/form";
import { Input } from "@/core/components/ui/input";
import { Textarea } from "@/core/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card";
import { Switch } from "@/core/components/ui/switch";
import { DatePicker } from "@/core/components/ui/date-picker";
import { PrivacySettingsForm } from "@/core/components/other/privacy-settings-form";

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

interface ProfileEditFormProps {
    initialData: Profile;
    onSave: () => void;
}

export function ProfileEditForm({ initialData, onSave }: ProfileEditFormProps) {
    const queryClient = useQueryClient();
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
        onSuccess: (updatedProfile) => {
            toast.success("Profil başarıyla güncellendi!");

            queryClient.invalidateQueries({ queryKey: ["my-profile"] });
            onSave();
        },
        onError: (error) => {
            toast.error("Profil güncellenirken bir hata oluştu.", {
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
    }, [initialData, form.reset]);

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
                <CardTitle>Profili Düzenle</CardTitle>
                <CardDescription>Değişikliklerinizi yapın ve kaydedin.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="firstName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>İsim</FormLabel>
                                    <FormControl>
                                        <Input placeholder="İsminiz" {...field} value={field.value ?? ""} />
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
                                    <FormLabel>Soyisim</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Soyisminiz" {...field} value={field.value ?? ""} />
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
                                    <FormLabel>Durum</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Durumunuz (örn: Oyunda)" {...field} value={field.value ?? ""} />
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
                                    <FormLabel>Doğum Tarihi</FormLabel>
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
                                        <FormLabel>Doğum Tarihini Profilde Göster</FormLabel>
                                        <FormDescription>İşaretlenirse, doğum tarihiniz herkese açık profilinizde görünür.</FormDescription>
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
                                    <FormLabel>Bio</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Kendinizden bahsedin..." className="resize-none" {...field} value={field.value ?? ""} />
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
                                    <FormLabel>Telefon Numarası</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Telefon numaranız" {...field} value={field.value ?? ""} />
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
                                        <FormLabel>Telefon Numarasını Profilde Göster</FormLabel>
                                        <FormDescription>İşaretlenirse, telefon numaranız herkese açık profilinizde görünür.</FormDescription>
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
                                        <FormLabel>E-postayı Profilde Göster</FormLabel>
                                        <FormDescription>İşaretlenirse, e-posta adresiniz herkese açık profilinizde görünür.</FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch checked={field.value} onCheckedChange={field.onChange} className="cursor-pointer" />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <PrivacySettingsForm initialData={initialData} />

                        <Button className="cursor-pointer" type="submit" disabled={isPending}>
                            {isPending ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
