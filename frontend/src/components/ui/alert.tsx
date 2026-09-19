import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  [
    "relative w-full rounded-lg border px-3.5 py-3 text-left text-sm",
    "grid gap-0.5",
    "[&>svg]:h-4 [&>svg]:w-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
    "[&:has(>svg)]:grid-cols-[auto_1fr] [&:has(>svg)]:gap-x-2.5 [&>svg]:row-span-2",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "border-border bg-card text-card-foreground",
        info: "border-info-border bg-info-muted text-info-strong",
        success: "border-success-border bg-success-muted text-success-strong",
        warning: "border-warning-border bg-warning-muted text-warning-strong",
        destructive:
          "border-destructive-border bg-destructive-muted text-destructive-strong",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    data-slot="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="alert-title"
    className={cn("font-semibold leading-5", className)}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="alert-description"
    className={cn(
      "text-sm leading-5 [&_p:not(:last-child)]:mb-3 [&_a]:underline [&_a]:underline-offset-2",
      className,
    )}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

const AlertAction = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="alert-action"
    className={cn("absolute right-2.5 top-2.5", className)}
    {...props}
  />
));
AlertAction.displayName = "AlertAction";

export { Alert, AlertTitle, AlertDescription, AlertAction, alertVariants };
