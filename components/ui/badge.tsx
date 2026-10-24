import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/10 text-primary",
        outline: "border-border text-foreground",
        // Selo cheio: "Batida", "Meta batida" sobre fundo escuro.
        solid: "border-transparent bg-primary font-semibold text-primary-foreground",
        // Selo escuro para usar sobre um card em destaque (fundo primary).
        inverse: "border-transparent bg-primary-foreground font-semibold text-primary",
        warning: "border-transparent bg-warning/15 text-warning",
        muted: "border-transparent bg-muted text-muted-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
