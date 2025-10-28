"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ListCategory, ListVisibilitySetting, UserList, UserListDetail, UserListForCreation, UserListForUpdate } from "@/models/list/list.model";
import { Button } from "@core/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@core/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@core/components/ui/form";
import { Input } from "@core/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@core/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@core/components/ui/radio-group";
import { Textarea } from "@core/components/ui/textarea";
import { Globe, Lock, Users } from "lucide-react";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
    name: z.string().min(3, { message: "Liste adı en az 3 karakter olmalıdır." }).max(100, { message: "Liste adı en fazla 100 karakter olabilir." }),
    description: z.string().max(500, { message: "Açıklama en fazla 500 karakter olabilir." }).optional(),
    visibility: z.nativeEnum(ListVisibilitySetting).transform((val) => Number(val)),
    category: z.nativeEnum(ListCategory).transform((val) => Number(val)),
});

type FormSchemaType = z.infer<typeof formSchema>;

const categoryOptions = Object.keys(ListCategory)
    .filter((v) => !isNaN(Number(v)))
    .map((key: any) => {
        const label = ListCategory[key as any];
        return {
            value: key,
            label: label === "Other" ? "Diğer" : label,
        };
    });

const visibilityOptions = [
    {
        value: String(ListVisibilitySetting.Public),
        label: "Herkese Açık",
        description: "Tüm kullanıcılar bu listeyi görebilir ve takip edebilir.",
        icon: Globe,
    },
    {
        value: String(ListVisibilitySetting.Followers),
        label: "Sadece Takipçiler",
        description: "Sadece sizi takip edenler bu listeyi görebilir.",
        icon: Users,
    },
    {
        value: String(ListVisibilitySetting.Private),
        label: "Özel",
        description: "Bu listeyi sadece siz görebilirsiniz.",
        icon: Lock,
    },
];

interface ListFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (values: UserListForCreation | UserListForUpdate) => void;
    isPending: boolean;
    defaultValues?: UserList | UserListDetail | null;
}

export function ListFormModal({ isOpen, onClose, onSubmit, isPending, defaultValues }: ListFormModalProps) {
    const isEditing = !!defaultValues;
    const title = isEditing ? "Listeyi Düzenle" : "Yeni Liste Oluştur";
    const description = isEditing ? "Listenizin ayrıntılarını güncelleyin." : "Koleksiyonunuz için yeni bir liste oluşturun.";
    const actionLabel = isEditing ? "Değişiklikleri Kaydet" : "Oluştur";

    const form = useForm<FormSchemaType>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: defaultValues?.name || "",
            description: defaultValues?.description || "",
            visibility: defaultValues?.visibility ?? ListVisibilitySetting.Private,
            category: defaultValues?.category ?? ListCategory.Other,
        },
    });

    useEffect(() => {
        if (isOpen) {
            form.reset({
                name: defaultValues?.name || "",
                description: defaultValues?.description || "",
                visibility: defaultValues?.visibility ?? ListVisibilitySetting.Private,
                category: defaultValues?.category ?? ListCategory.Other,
            });
        }
    }, [isOpen, defaultValues, form]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] max-h-[100vh] flex flex-col overflow-hidden">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto pr-6 pl-1 py-4">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            {/* Liste Adı */}
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Liste Adı</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Örn: Favori RPG'lerim" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {/* Açıklama */}
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Açıklama (Opsiyonel)</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Bu liste hakkında kısa bir açıklama..." className="resize-none" {...field} value={field.value || ""} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {/* Kategori */}
                            <FormField
                                control={form.control}
                                name="category"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Kategori</FormLabel>
                                        <Select onValueChange={(value) => field.onChange(Number(value))} value={String(field.value)}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Bir kategori seçin..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {categoryOptions.map((opt) => (
                                                    <SelectItem key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {/* Görünürlük */}
                            <FormField
                                control={form.control}
                                name="visibility"
                                render={({ field }) => (
                                    <FormItem className="space-y-3">
                                        <FormLabel>Görünürlük</FormLabel>
                                        <FormControl>
                                            <RadioGroup onValueChange={(value) => field.onChange(Number(value))} value={String(field.value)} className="gap-4 grid grid-cols-1 sm:grid-cols-3">
                                                {visibilityOptions.map((opt) => {
                                                    const Icon = opt.icon;
                                                    const isChecked = String(field.value) === opt.value;
                                                    return (
                                                        <FormItem key={opt.value}>
                                                            <FormLabel
                                                                className={`
                                flex flex-col items-center justify-center rounded-md border p-4
                                cursor-pointer transition-colors
                                hover:border-primary
                                ${isChecked ? "border-transparent ring-2 ring-primary" : ""}
                              `}
                                                            >
                                                                <FormControl>
                                                                    <RadioGroupItem value={opt.value} className="sr-only" />
                                                                </FormControl>
                                                                <Icon className="h-6 w-6 mb-2" />
                                                                <span>{opt.label}</span>
                                                                <FormDescription className="text-xs text-center mt-1">{opt.description}</FormDescription>
                                                            </FormLabel>
                                                        </FormItem>
                                                    );
                                                })}
                                            </RadioGroup>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={onClose} disabled={isPending} className="cursor-pointer">
                                    İptal
                                </Button>
                                <Button type="submit" disabled={isPending} className="cursor-pointer">
                                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {actionLabel}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </div>
            </DialogContent>
        </Dialog>
    );
}
