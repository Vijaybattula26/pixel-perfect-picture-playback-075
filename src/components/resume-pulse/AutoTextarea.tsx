import { forwardRef, useCallback, useLayoutEffect, useRef, type ComponentProps } from "react";

import { cn } from "@/lib/utils";

type Props = ComponentProps<"textarea"> & { minRows?: number; maxHeight?: number };

/** Textarea that grows with its content up to maxHeight, then scrolls. */
export const AutoTextarea = forwardRef<HTMLTextAreaElement, Props>(function AutoTextarea(
  { className, value, maxHeight = 560, ...props },
  forwardedRef,
) {
  const innerRef = useRef<HTMLTextAreaElement | null>(null);

  const setRefs = useCallback(
    (el: HTMLTextAreaElement | null) => {
      innerRef.current = el;
      if (typeof forwardedRef === "function") forwardedRef(el);
      else if (forwardedRef) forwardedRef.current = el;
    },
    [forwardedRef],
  );

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [value, maxHeight]);

  return <textarea ref={setRefs} value={value} className={cn(textareaBase, className)} {...props} />;
});

export const textareaBase =
  "block w-full resize-none rounded-xl border border-input bg-card px-4 py-3 text-sm leading-relaxed text-foreground placeholder:text-subtle-foreground transition-[border-color,box-shadow] hover:border-border-strong focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15";
