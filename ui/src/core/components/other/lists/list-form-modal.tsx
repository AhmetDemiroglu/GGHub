"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ListCategory, ListVisibilitySetting, UserList, UserListForCreation } from "@/models/list/list.model";
import { Button } from "@core/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@core/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@core/components/ui/form";
import { Input } from "@core/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@core/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@core/components/ui/radio-group";
import { Textarea } from "@core/components/ui/textarea";
import { Globe, Lock, Users } from "lucide-react";
import { Loader2 } from "lucide-react";

// Backend Enum'larına dayalı Zod şeması
const formSchema = z.object({
    name: z.string().min(3, { message: "Liste adı en az 3 karakter olmalıdır." }).max(100, { message: "Liste adı en fazla 100 karakter olabilir." }),
    description: z.string().max(500, { message: "Açıklama en fazla 500 karakter olabilir." }).optional(),
    visibility: z.nativeEnum(ListVisibilitySetting).transform((val) => Number(val)), // Gelen string'i sayıya çevir
    category: z.nativeEnum(ListCategory).transform((val) => Number(val)), // Gelen string'i sayıya çevir
});

type FormSchemaType = z.infer<typeof formSchema>;

// Enum'ları Select/Radio için seçeneklere dönüştürme
const categoryOptions = Object.keys(ListCategory)
    .filter((v) => !isNaN(Number(v)))
    .map((key: any) => ({
        value: key,
        label: ListCategory[key as any],
    }));

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
    // Hem Create (UserListForCreation) hem de Update (UserListForUpdate)
    // aynı DTO'yu kullandığı için UserListForCreation alıyoruz
    onSubmit: (values: UserListForCreation) => void;
    isPending: boolean;
    // Düzenleme modu için
    defaultValues?: UserList | null;
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

    // Modal her açıldığında (veya düzenleme verisi değiştiğinde) formu resetle
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

    const handleFormSubmit = (values: FormSchemaType) => {
        onSubmit(values);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
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
                            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                                İptal
                            </Button>
                            <Button type="submit" disabled={isPending}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {actionLabel}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
