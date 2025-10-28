"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@core/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@core/components/ui/form";
import { Textarea } from "@core/components/ui/textarea";
import { Loader2, Send } from "lucide-react";
import type { UserListCommentForCreation } from "@/models/list/list.model";
import { Avatar, AvatarFallback, AvatarImage } from "@core/components/ui/avatar";
import { useForm, UseFormReturn } from "react-hook-form";
import { forwardRef, useImperativeHandle } from "react";
import { useAuth } from "@core/hooks/use-auth";

const commentFormSchema = z.object({
    content: z.string().min(1, { message: "Yorum boş olamaz." }).max(1000, { message: "Yorum en fazla 1000 karakter olabilir." }),
});

type CommentFormSchemaType = z.infer<typeof commentFormSchema>;

interface ListCommentFormProps {
    onSubmit: (values: UserListCommentForCreation) => void;
    isPending: boolean;
    parentCommentId?: number;
    onCancelReply?: () => void;
    placeholder?: string;
}

export const ListCommentForm = forwardRef<{ reset: () => void }, ListCommentFormProps>(({ onSubmit, isPending, parentCommentId, onCancelReply, placeholder = "Yorumunuzu yazın..." }, ref) => {
    const { user } = useAuth();
    const form = useForm<CommentFormSchemaType>({
        resolver: zodResolver(commentFormSchema),
        defaultValues: {
            content: "",
        },
    });

    useImperativeHandle(ref, () => ({
        reset: () => form.reset({ content: "" }),
    }));

    const handleFormSubmit = (values: CommentFormSchemaType) => {
        onSubmit({
            content: values.content,
            parentCommentId: parentCommentId,
        });
    };
    const getImageUrl = (path: string | null | undefined) => {
        if (!path) return undefined;
        const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
        return `${API_BASE}${path}`;
    };
    const avatarSrc = getImageUrl(null);

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="flex items-start gap-3">
                <Avatar className="h-9 w-9 mt-1 flex-shrink-0">
                    <AvatarImage src={avatarSrc} />
                    <AvatarFallback>{user?.username ? user.username.substring(0, 2).toUpperCase() : "?"}</AvatarFallback>
                </Avatar>

                {/* Form Alanı ve Butonlar */}
                <div className="flex-1 space-y-2">
                    <FormField
                        control={form.control}
                        name="content"
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <Textarea placeholder={placeholder} className="resize-none min-h-[60px]" rows={2} {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    {/* Gönder ve İptal Butonları */}
                    <div className="flex justify-end gap-2">
                        {parentCommentId && onCancelReply && (
                            <Button type="button" variant="ghost" size="sm" onClick={onCancelReply} disabled={isPending}>
                                İptal
                            </Button>
                        )}
                        <Button type="submit" size="sm" disabled={isPending} className="cursor-pointer mt-1">
                            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            {parentCommentId ? "Yanıtla" : "Gönder"}
                        </Button>
                    </div>
                </div>
            </form>
        </Form>
    );
});
ListCommentForm.displayName = "ListCommentForm";
