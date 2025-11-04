"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { pageview } from "@/core/lib/ga";

export default function GAListener() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastRef = useRef<string>("");

  useEffect(() => {
    const q = searchParams?.toString();
    const path = q ? `${pathname}?${q}` : pathname;

    if (lastRef.current === path) return;
    lastRef.current = path;

    pageview(path);
  }, [pathname, searchParams]);

  return null;
}
