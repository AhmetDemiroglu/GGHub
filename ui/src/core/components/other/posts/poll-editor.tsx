"use client";

import { Plus, X } from "lucide-react";

import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/core/components/ui/select";
import { useI18n } from "@/core/contexts/locale-context";
import { POLL_MAX_OPTIONS, POLL_MAX_OPTION_LENGTH, POLL_MIN_OPTIONS } from "@/models/post/post.model";

export interface PollDraft {
    options: string[];
    durationDays: number;
}

interface PollEditorProps {
    draft: PollDraft;
    onChange: (draft: PollDraft) => void;
    onRemove: () => void;
}

const DURATIONS = [1, 3, 7];

export function PollEditor({ draft, onChange, onRemove }: PollEditorProps) {
    const t = useI18n();

    const setOption = (index: number, text: string) =>
        onChange({ ...draft, options: draft.options.map((o, i) => (i === index ? text : o)) });

    return (
        <div className="mt-3 space-y-2 rounded-xl border border-border/60 p-3">
            {draft.options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                    <Input
                        value={option}
                        maxLength={POLL_MAX_OPTION_LENGTH}
                        placeholder={t("posts.poll.optionPlaceholder", { index: index + 1 })}
                        onChange={(event) => setOption(index, event.target.value)}
                    />
                    {draft.options.length > POLL_MIN_OPTIONS ? (
                        <button
                            type="button"
                            onClick={() =>
                                onChange({ ...draft, options: draft.options.filter((_, i) => i !== index) })
                            }
                            className="cursor-pointer rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            aria-label={t("posts.poll.removeOption")}
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    ) : null}
                </div>
            ))}

            <div className="flex flex-wrap items-center gap-2 pt-1">
                {draft.options.length < POLL_MAX_OPTIONS ? (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="cursor-pointer"
                        onClick={() => onChange({ ...draft, options: [...draft.options, ""] })}
                    >
                        <Plus className="h-3.5 w-3.5" />
                        {t("posts.poll.addOption")}
                    </Button>
                ) : null}

                <Select
                    value={String(draft.durationDays)}
                    onValueChange={(value) => onChange({ ...draft, durationDays: Number(value) })}
                >
                    <SelectTrigger size="sm" className="w-auto cursor-pointer">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {DURATIONS.map((days) => (
                            <SelectItem key={days} value={String(days)}>
                                {t("posts.poll.duration", { count: days })}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="ml-auto cursor-pointer text-destructive hover:text-destructive"
                    onClick={onRemove}
                >
                    {t("posts.poll.remove")}
                </Button>
            </div>
        </div>
    );
}
