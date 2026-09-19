import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  [
    "inline-flex w-fit shrink-0 items-center justify-center gap-1 whitespace-nowrap",
    "rounded-md border border-transparent px-2 py-0.5 text-xs font-medium leading-5",
    "transition-colors duration-150",
    "[&>svg]:pointer-events-none [&>svg]:h-3 [&>svg]:w-3",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        outline: "border-border bg-card text-muted-foreground",
        subtle: "bg-accent text-accent-foreground",
        success: "bg-success-muted text-success-strong",
        warning: "bg-warning-muted text-warning-strong",
        destructive: "bg-destructive-muted text-destructive-strong",
        info: "bg-info-muted text-info-strong",
        ghost: "text-muted-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

/**
 * Semantic shorthand used across the app's status columns.
 * `tone` is resolved to a `variant` when no explicit variant is given.
 */
export type BadgeTone =
  | "brand"
  | "neutral"
  | "ok"
  | "warn"
  | "danger"
  | "info";

const TONE_TO_VARIANT: Record<
  BadgeTone,
  NonNullable<VariantProps<typeof badgeVariants>["variant"]>
> = {
  brand: "default",
  neutral: "outline",
  ok: "success",
  warn: "warning",
  danger: "destructive",
  info: "info",
};

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  asChild?: boolean;
  tone?: BadgeTone;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, tone, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "span";
    const resolved = variant ?? (tone ? TONE_TO_VARIANT[tone] : undefined);

    return (
      <Comp
        ref={ref}
        data-slot="badge"
        data-tone={tone}
        className={cn(badgeVariants({ variant: resolved }), className)}
        {...props}
      />
    );
  },
);

Badge.displayName = "Badge";

export { Badge, badgeVariants };
