import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.6875rem] font-medium tracking-wide uppercase",
  {
    variants: {
      variant: {
        default: "bg-secondary text-secondary-foreground",
        pending: "bg-status-pending text-status-pending-fg",
        confirmed: "bg-status-confirmed text-status-confirmed-fg",
        checkin: "bg-status-checkin text-status-checkin-fg",
        checkout: "bg-status-checkout text-status-checkout-fg",
        cancelled: "bg-status-cancelled text-status-cancelled-fg",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
