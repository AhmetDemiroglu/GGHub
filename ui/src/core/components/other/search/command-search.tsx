"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Search } from "lucide-react";
import { useCurrentLocale } from "@/core/contexts/locale-context";
import { Button } from "@/core/components/ui/button";

// Palet (cmdk + dialog + sorgu) yalniz ilk acilista iner; gerekce command-search-dialog.tsx'te.
const CommandSearchDialog = dynamic(() => import("./command-search-dialog"), { ssr: false });

interface CommandSearchProps {
    variant?: "default" | "sidebar";
    collapsed?: boolean;
}

export function CommandSearch({ variant = "default", collapsed = false }: CommandSearchProps) {
    const locale = useCurrentLocale();
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((o) => !o);
            }
        };
        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    const placeholder = locale === "tr" ? "Oyun, kullanıcı veya liste ara..." : "Search games, users, or lists...";
    const shortPlaceholder = locale === "tr" ? "Ara..." : "Search...";

    return (
        <>
            {variant === "sidebar" ? (
                /* Sidebar trigger - matches nav item sizing exactly */
                <button
                    onClick={() => setOpen(true)}
                    className={`flex w-full cursor-pointer items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground py-2.5 ${
                        collapsed ? "justify-center px-2" : "gap-3 px-3"
                    }`}
                >
                    <Search className="h-[1.15rem] w-[1.15rem] shrink-0" />
                    {!collapsed && <span className="sidebar-label truncate text-sm font-medium">{shortPlaceholder}</span>}
                </button>
            ) : (
                <>
                    {/* Desktop trigger pill */}
                    <button
                        onClick={() => setOpen(true)}
                        className="hidden cursor-pointer items-center gap-2 rounded-full border border-border/50 bg-muted/50 px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:inline-flex"
                    >
                        <Search className="h-4 w-4" />
                        <span className="hidden lg:inline">{placeholder}</span>
                        <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium lg:inline-flex">
                            <span className="text-xs">Ctrl</span>K
                        </kbd>
                    </button>

                    {/* Mobile trigger */}
                    <Button variant="ghost" size="icon" className="h-9 w-9 cursor-pointer md:hidden" onClick={() => setOpen(true)}>
                        <Search className="h-5 w-5" />
                    </Button>
                </>
            )}

            {open ? <CommandSearchDialog open={open} onOpenChange={setOpen} /> : null}
        </>
    );
}
