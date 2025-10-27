"use client";

import { Button } from "@/core/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@core/components/ui/tooltip";
import { ChevronLeft, ChevronRight, Home, List, MessageSquare, Gamepad2, Library } from "lucide-react";
import Link from "next/link";
import React from "react";

const navLinks = [
  { href: "/", label: "Ana Sayfa", icon: Home },
  { href: "/discover", label: "Oyunları Keşfet", icon: Gamepad2 },
  { href: "/lists", label: "Listeleri Keşfet", icon: Library },
  { href: "/my-lists", label: "Listelerim", icon: List },
  { href: "/messages", label: "Mesajlar", icon: MessageSquare },
];

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
}

export function Sidebar({ isCollapsed, setIsCollapsed }: SidebarProps) {
  return (
    <aside
      className={`relative flex h-full flex-col bg-background transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-20" : "w-60"
      }`}
    >
      {/* Toggle Buton Alanı */}
      <div className="px-4 pt-4 pb-0 border-t">
        <Button
          size="icon"
          variant="outline"
          className="w-full cursor-pointer"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? <ChevronRight /> : <ChevronLeft />}
        </Button>
      </div>
      {/* Ana Navigasyon Alanı */}
      <nav className="flex-1 p-4 space-y-2">
        {navLinks.map((link) => {
          const Icon = link.icon;
          return isCollapsed ? (
            <TooltipProvider key={link.href}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href={link.href}>
                    <Button variant="ghost" size="icon" className="w-full cursor-pointer">
                      <Icon />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{link.label}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Link href={link.href} key={link.href}>
              <Button variant="ghost" className="w-full justify-start gap-2 cursor-pointer">
                <Icon /> {link.label}
              </Button>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}