import { Gamepad2, Sparkles, Trophy, Users } from "lucide-react";

export default function UnauthenticatedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      {/* Brand radial glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.10),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(139,92,246,0.10),_transparent_60%)]"
      />
      {/* Subtle grid, faded toward the edges */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
      />
      {/* Floating gaming accents */}
      <Gamepad2 aria-hidden className="pointer-events-none absolute left-[12%] top-[16%] h-10 w-10 animate-pulse text-cyan-400/20" />
      <Sparkles aria-hidden className="pointer-events-none absolute right-[14%] top-[22%] h-9 w-9 animate-pulse text-fuchsia-400/20 [animation-duration:4s]" />
      <Trophy aria-hidden className="pointer-events-none absolute bottom-[18%] left-[16%] h-9 w-9 animate-pulse text-amber-300/15 [animation-duration:5s]" />
      <Users aria-hidden className="pointer-events-none absolute bottom-[20%] right-[12%] h-10 w-10 animate-pulse text-blue-400/15 [animation-duration:6s]" />

      <div className="relative z-10 flex w-full justify-center">{children}</div>
    </div>
  );
}
