"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { forwardRef, useImperativeHandle, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { Loader, Send } from "lucide-react";
import * as z from "zod";

import { getMyProfile } from "@/api/profile/profile.api";
import { MentionTextarea } from "@core/components/base/mention-textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar";
import { Button } from "@core/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@core/components/ui/form";
import { useI18n } from "@/core/contexts/locale-context";
import { useAuth } from "@core/hooks/use-auth";
import { getImageUrl } from "@/core/lib/get-image-url";
import type { ReviewCommentForCreation } from "@/models/review/review-comment.model";

type TranslateFn = (key: string, values?: Record<string, string | number>) => string;

const buildSchema = (t: TranslateFn) =>
    z.object({
        content: z
            .string()
            .min(1, { message: t("reviewComments.emptyError") })
            .max(1000, { message: t("reviewComments.maxLengthError") }),
    });

type ReviewCommentFormValues = z.infer<ReturnType<typeof buildSchema>>;

interface ReviewCommentFormProps {
    onSubmit: (values: ReviewCommentForCreation) => void;
    isPending: boolean;
    parentCommentId?: number;
    onCancelReply?: () => void;
    placeholder?: string;
}

export const ReviewCommentForm = forwardRef<{ reset: () => void }, ReviewCommentFormProps>(function ReviewCommentForm(
    { onSubmit, isPending, parentCommentId, onCancelReply, placeholder },
    ref
) {
    const t = useI18n();
    const { user } = useAuth();
    const { data: myProfile } = useQuery({
        queryKey: ["my-profile"],
        queryFn: getMyProfile,
        staleTime: 5 * 60 * 1000,
    });

    const schema = useMemo(() => buildSchema(t), [t]);

    const form = useForm<ReviewCommentFormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            content: "",
        },
    });

    useImperativeHandle(ref, () => ({
        reset: () => form.reset({ content: "" }),
    }));

    const handleFormSubmit = (values: ReviewCommentFormValues) => {
        onSubmit({
            content: values.content,
            parentCommentId,
        });
    };

    const avatarSrc = getImageUrl(myProfile?.profileImageUrl);

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="flex items-start gap-3">
                <Avatar className="mt-1 h-8 w-8 flex-shrink-0 sm:h-9 sm:w-9">
                    <AvatarImage src={avatarSrc} />
                    <AvatarFallback>{user?.username ? user.username.substring(0, 2).toUpperCase() : "?"}</AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-2">
                    <FormField
                        control={form.control}
                        name="content"
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <MentionTextarea
                                        placeholder={placeholder ?? t("reviewComments.placeholder")}
                                        className="min-h-[60px] resize-none"
                                        rows={2}
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="flex justify-end gap-2">
                        {parentCommentId && onCancelReply && (
                            <Button type="button" variant="ghost" size="sm" onClick={onCancelReply} disabled={isPending} className="cursor-pointer">
                                {t("reviewComments.cancel")}
                            </Button>
                        )}
                        <Button type="submit" size="sm" disabled={isPending} className="mt-1 cursor-pointer">
                            {isPending ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            {parentCommentId ? t("reviewComments.reply") : t("reviewComments.send")}
                        </Button>
                    </div>
                </div>
            </form>
        </Form>
    );
});
