"use client";

import React, { createContext, useContext, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, Circle, ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ShimmerText } from "@/components/ui/components-ai-thought-chain-utils/text-shimmer";

type Status = "done" | "active" | "pending";

type StepContextType = {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  status: Status;
};

const StepContext = createContext<StepContextType | null>(null);

const statusStyles: Record<
  Status,
  { label: string; line: string; badge: string }
> = {
  done: {
    label: "text-gray-400",
    line: "bg-emerald-600/30",
    badge: "",
  },
  active: {
    label: "text-white",
    line: "bg-blue-500/25",
    badge: "bg-blue-950/60 text-blue-400 border border-blue-500/30",
  },
  pending: {
    label: "text-gray-600",
    line: "bg-white/10",
    badge: "",
  },
};

function StatusIcon({ status }: { status: Status }) {
  if (status === "done") {
    return (
      <span className="flex size-5 items-center justify-center rounded-full bg-emerald-600/80 border border-emerald-500/50">
        <Check className="size-3 text-white" strokeWidth={3} />
      </span>
    );
  }

  if (status === "active") {
    return (
      <motion.span
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 0.75, ease: "linear" }}
        className="flex size-5 items-center justify-center"
      >
        <Loader2 className="size-5 text-blue-400" />
      </motion.span>
    );
  }

  return <Circle className="size-5 text-gray-700" />;
}

// ─── ThoughtChain Root ────────────────────────────────────────────────────────
export function ThoughtChain({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-0", className)}>
      {children}
    </div>
  );
}

// ─── ThoughtChainStep ─────────────────────────────────────────────────────────
export function ThoughtChainStep({
  children,
  status,
  className,
}: {
  children: React.ReactNode;
  status: Status;
  className?: string;
}) {
  const [open, setOpen] = useState(status === "active");

  // Auto-open when active
  React.useEffect(() => {
    if (status === "active") setOpen(true);
    if (status === "done") setOpen(false);
  }, [status]);

  return (
    <StepContext.Provider value={{ open, setOpen, status }}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className={cn("flex gap-3 relative", className)}>
          {/* Timeline line */}
          <div className="flex flex-col items-center">
            <div className="mt-1 shrink-0 z-10">
              <StatusIcon status={status} />
            </div>
            <div
              className={cn(
                "w-px flex-1 mt-2 mb-0 min-h-[20px] transition-colors duration-500",
                statusStyles[status].line
              )}
            />
          </div>

          {/* Content */}
          <div className="flex-1 pb-4">
            {children}
          </div>
        </div>
      </Collapsible>
    </StepContext.Provider>
  );
}

// ─── ThoughtChainTrigger ──────────────────────────────────────────────────────
export function ThoughtChainTrigger({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = useContext(StepContext);
  if (!ctx) throw new Error("ThoughtChainTrigger must be inside ThoughtChainStep");
  const { open, status } = ctx;

  return (
    <CollapsibleTrigger asChild>
      <button
        className={cn(
          "flex w-full items-center gap-2 text-left transition-colors duration-200",
          statusStyles[status].label,
          className
        )}
      >
        <span
          className={cn(
            "flex-1 text-xs font-mono font-semibold uppercase tracking-wider",
            status === "active" && "text-blue-300"
          )}
        >
          {status === "active" ? (
            <ShimmerText text={typeof children === "string" ? children : String(children)} />
          ) : (
            children
          )}
        </span>

        {status === "active" && (
          <Badge className={cn("text-[10px] px-1.5 py-0 h-4 font-ndot", statusStyles[status].badge)}>
            ACTIVE
          </Badge>
        )}
        {status === "done" && (
          <span className="text-[10px] font-ndot text-emerald-500">DONE</span>
        )}

        <ChevronDown
          className={cn(
            "size-3 shrink-0 transition-transform duration-200 text-gray-600",
            open && "rotate-180"
          )}
        />
      </button>
    </CollapsibleTrigger>
  );
}

// ─── ThoughtChainContent ──────────────────────────────────────────────────────
export function ThoughtChainContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <CollapsibleContent>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className={cn("mt-2 flex flex-col gap-1.5", className)}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </CollapsibleContent>
  );
}

// ─── ThoughtChainItem ─────────────────────────────────────────────────────────
export function ThoughtChainItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = useContext(StepContext);
  const status = ctx?.status ?? "pending";

  return (
    <div
      className={cn(
        "flex items-start gap-2 text-[11px] font-mono",
        status === "done" && "text-gray-600",
        status === "active" && "text-gray-300",
        status === "pending" && "text-gray-700",
        className
      )}
    >
      <span
        className={cn(
          "mt-1 shrink-0 size-1.5 rounded-full",
          status === "done" && "bg-emerald-700",
          status === "active" && "bg-blue-500 animate-pulse",
          status === "pending" && "bg-gray-700"
        )}
      />
      {children}
    </div>
  );
}
