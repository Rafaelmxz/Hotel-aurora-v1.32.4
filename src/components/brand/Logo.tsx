import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-8", className)}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path
        d="M7 22V15.5c0-4.7 4-8.5 9-8.5s9 3.8 9 8.5V22"
        fill="none"
        className="stroke-primary-foreground"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M11 22v-5.2c0-2.7 2.2-4.8 5-4.8s5 2.1 5 4.8V22"
        className="fill-primary-foreground/15 stroke-primary-foreground"
        strokeWidth="1.25"
      />
      <rect x="14.4" y="18" width="3.2" height="4" rx="0.6" className="fill-primary-foreground" />
    </svg>
  );
}
