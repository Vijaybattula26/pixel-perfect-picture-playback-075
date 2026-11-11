import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface PanelCardProps {
  id: string;
  title: string;
  icon: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function PanelCard({ id, title, icon: Icon, action, children, className }: PanelCardProps) {
  return (
    <section aria-labelledby={id} className={cn("surface-card flex h-full flex-col", className)}>
      <header className="flex min-h-16 items-center justify-between gap-3 border-b border-border px-5 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="grid size-7 place-items-center rounded-md bg-primary-soft text-primary">
            <Icon className="size-4" aria-hidden />
          </span>
          <h2 id={id} className="text-sm font-semibold tracking-tight text-foreground">
            {title}
          </h2>
        </div>
        {action}
      </header>
      <div className="flex flex-1 flex-col p-5 sm:p-6">{children}</div>
    </section>
  );
}
