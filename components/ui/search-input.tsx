import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input, type InputProps } from "@/components/ui/input";

/** Campo de busca com ícone de lupa. */
const SearchInput = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <div className={cn("relative", className)}>
    <Search
      aria-hidden
      className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground"
    />
    <Input ref={ref} type="search" className="pl-10" {...props} />
  </div>
));
SearchInput.displayName = "SearchInput";

export { SearchInput };
