import type { CSSProperties, ReactNode } from "react";

export type IconName = "arrow" | "arrow-up" | "check" | "clock" | "shield" | "calculator" | "house" | "extension" | "bath" | "kitchen" | "roof" | "renovation" | "paint" | "chevron" | "close" | "menu" | "download" | "pin" | "file" | "spark" | "plus" | "lock" | "ruler";

export function Icon({ name, size = 24, className, style }: { name: IconName; size?: number; className?: string; style?: CSSProperties }) {
  const paths: Record<IconName, ReactNode> = {
    arrow: <path d="M4 12h15m-6-6 6 6-6 6" />,
    "arrow-up": <path d="M6 18 18 6M6 6h12v12" />,
    check: <path d="m5 12 4 4L19 6" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" /><path d="m8 12 3 3 5-6" /></>,
    calculator: <><rect x="5" y="2" width="14" height="20" rx="2" /><path d="M8 6h8M8 10h1m6 0h1m-8 4h1m6 0h1m-8 4h1m6 0h1" /></>,
    house: <path d="m2 11 10-8 10 8M5 9v12h14V9M10 21v-7h4v7" />,
    extension: <><path d="M3 21V8l7-5 7 5v13M3 10h14M7 21v-6h6v6M17 12h5v9H2M7 7h6" /><path d="M19 15v3" /></>,
    bath: <path d="M3 12h18v3a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5v-3ZM5 12V5a2 2 0 0 1 4 0M7 20v2m10-2v2M8 6h3" />,
    kitchen: <path d="M2 11h20M3 11v10h18V11M11 11v10M6 15h2m7 0h3M4 8V3h6v5M14 3h6v5h-6zM16 11V8" />,
    roof: <path d="M2 19 9 4h6l7 15H2ZM8 19v-8l4-3 4 3v8M10 14h4v5M4 22h16" />,
    renovation: <><path d="M3 11 12 3l9 8M5 9v12h14V9M9 21v-7h6v7M3 17h4m10-4h4" /><path d="m15 4 4 4" /></>,
    paint: <><rect x="3" y="3" width="14" height="6" rx="1" /><path d="M17 6h4v7H11v3" /><rect x="9" y="16" width="4" height="6" rx="1" /></>,
    chevron: <path d="m8 10 4 4 4-4" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    download: <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />,
    pin: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2" /></>,
    file: <path d="M14 3H5v18h14V8l-5-5ZM14 3v5h5M8 12h8M8 16h6" />,
    spark: <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z" />,
    plus: <path d="M12 5v14M5 12h14" />,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>,
    ruler: <path d="m3 16 13-13 5 5L8 21 3 16ZM8 11l3 3m1-7 3 3m1-7 3 3" />,
  };
  return <svg width={`${size / 16}rem`} height={`${size / 16}rem`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden="true">{paths[name]}</svg>;
}

export function Logo() {
  return <a className="brand" href="#" aria-label="Plan Bouw — naar de homepage"><svg width="42" height="43" viewBox="0 0 42 43" fill="none" aria-hidden="true"><path d="M3 37V16L20 4l17 12v21H23V23H13v14H3Z" stroke="currentColor" strokeWidth="2.3" /><path d="M23 23h14M13 16h10" stroke="currentColor" strokeWidth="2.3" /></svg><span>plan<span className="brand-light">bouw</span><span className="brand-dot">.</span></span></a>;
}
