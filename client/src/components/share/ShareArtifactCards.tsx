import { format, formatDistanceToNowStrict } from "date-fns";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  CircleDot,
  Clock3,
  MessageSquareQuote,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  ChatMessageTag,
  DecisionTimelineArtifact,
  WorkspaceHealthScore,
  WorkspaceSnapshotArtifact,
} from "@/Types/types";
import { cn } from "@/lib/utils";

const tagClasses: Record<ChatMessageTag, string> = {
  decision: "border-primary/25 bg-primary/15 text-primary",
  "action-item": "border-amber-400/20 bg-amber-400/10 text-amber-300",
  blocker: "border-rose-400/20 bg-rose-400/10 text-rose-300",
  update: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  question: "border-sky-400/20 bg-sky-400/10 text-sky-300",
  "follow-up": "border-muted-foreground/20 bg-muted/30 text-muted-foreground",
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  return format(date, "MMM d, h:mm a");
}

function healthToneClasses(status: WorkspaceHealthScore["status"]) {
  switch (status) {
    case "Healthy":
      return {
        badge: "border-emerald-300/25 bg-emerald-300/10 text-emerald-200",
        glow: "from-emerald-300/18 via-primary/10 to-transparent",
        line: "bg-emerald-300/70",
      };
    case "At Risk":
      return {
        badge: "border-amber-300/25 bg-amber-300/10 text-amber-200",
        glow: "from-amber-300/18 via-primary/10 to-transparent",
        line: "bg-amber-300/70",
      };
    default:
      return {
        badge: "border-rose-300/25 bg-rose-300/10 text-rose-200",
        glow: "from-rose-300/18 via-primary/10 to-transparent",
        line: "bg-rose-300/70",
      };
  }
}

const cardReveal = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

function CardShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.24 }}
      className={cn(
        "relative mx-auto w-full max-w-4xl overflow-hidden rounded-[1.15rem] border border-white/[0.075] bg-[#10121a] text-white shadow-[0_26px_90px_rgba(0,0,0,0.42)]",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:38px_38px] opacity-45" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
      <div className="pointer-events-none absolute -right-28 -top-28 h-80 w-80 rounded-full bg-primary/18 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-36 left-10 h-80 w-80 rounded-full bg-cyan-300/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-44 w-44 bg-[radial-gradient(circle,hsl(var(--primary)/0.12),transparent_62%)]" />
      <div className="relative">{children}</div>
    </motion.div>
  );
}

export function ShareArtifactSkeleton() {
  return (
    <Card className="app-surface">
      <CardContent className="space-y-4 p-4 sm:p-5 lg:p-6">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      </CardContent>
    </Card>
  );
}

export function ShareArtifactError({ message }: { message: string }) {
  return (
    <Empty className="app-surface border-dashed py-12">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <AlertTriangle className="size-4" />
        </EmptyMedia>
        <EmptyTitle>Preview could not load</EmptyTitle>
        <EmptyDescription>{message}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export function DecisionTimelineShareCard({
  artifact,
}: {
  artifact: DecisionTimelineArtifact;
}) {
  if (artifact.items.length === 0) {
    return (
      <Empty className="app-surface border-dashed py-12">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MessageSquareQuote className="size-4" />
          </EmptyMedia>
          <EmptyTitle>No decisions to package yet</EmptyTitle>
          <EmptyDescription>
            Tag decisions in group chat and Crevo will turn them into a clean
            timeline for this range.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <CardShell>
      <div className="space-y-6 p-4 sm:space-y-7 sm:p-7 lg:p-9">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="w-fit border-primary/25 bg-primary/15 text-primary">
                Decision Timeline
              </Badge>
              <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-white/45">
                Outcome card
              </span>
            </div>
            <div>
              <h2 className="max-w-2xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                {artifact.workspace.name} made the call.
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/62 sm:text-base">
                A curated trail of the decisions, blockers, and action moments
                that shaped the work.
              </p>
            </div>
          </div>
          <div className="rounded-[1rem] border border-white/10 bg-white/[0.045] p-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:text-right">
            <p className="text-xs uppercase tracking-[0.18em] text-white/40">
              Period
            </p>
            <p className="mt-1 text-sm font-medium text-white">
              {artifact.range.label}
            </p>
          </div>
        </header>

        <motion.div
          variants={cardReveal}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.22, delay: 0.04 }}
          className="grid gap-2 sm:grid-cols-4 sm:gap-3"
        >
          {[
            ["Decisions", artifact.summary.decisions],
            ["Action items", artifact.summary.actionItems],
            ["Blockers", artifact.summary.blockers],
            ["Contributors", artifact.summary.contributors],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-[1rem] border border-white/10 bg-white/[0.045] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] sm:p-4"
            >
              <p className="text-2xl font-semibold tracking-[-0.03em]">
                {value}
              </p>
              <p className="mt-1 text-xs uppercase tracking-[0.14em] text-white/42">
                {label}
              </p>
            </div>
          ))}
        </motion.div>

        <div className="space-y-3">
          {artifact.items.slice(0, 8).map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.035 }}
              className="group relative overflow-hidden rounded-[1rem] border border-white/10 bg-black/20 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-primary/70 via-white/10 to-transparent opacity-70" />
              <div className="absolute left-0 top-5 h-8 w-1 rounded-r-full bg-primary/85" />
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1 pl-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "border text-[10px]",
                        tagClasses[item.primaryTag],
                      )}
                    >
                      {item.primaryTag.replace("-", " ")}
                    </Badge>
                    <span className="text-xs text-white/38">
                      {item.conversationName}
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-3 text-base font-medium leading-7 text-white/95 sm:text-lg">
                    {item.decisionText}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3 rounded-xl border border-white/5 bg-white/[0.025] p-2 sm:w-52">
                  <Avatar className="h-9 w-9 border border-white/10">
                    <AvatarImage src={item.contributor.avatar ?? undefined} />
                    <AvatarFallback className="bg-white/10 text-xs text-white">
                      {initials(item.contributor.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                      {item.contributor.name}
                    </p>
                    <p className="text-xs text-white/42">
                      {formatDateTime(item.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <footer className="flex flex-col gap-3 border-t border-white/10 pt-5 text-xs text-white/42 sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Generated in Crevo
          </span>
          <span>
            {formatDistanceToNowStrict(new Date(artifact.generatedAt), {
              addSuffix: true,
            })}
          </span>
        </footer>
      </div>
    </CardShell>
  );
}

export function WorkspaceSnapshotShareCard({
  artifact,
}: {
  artifact: WorkspaceSnapshotArtifact;
}) {
  const tone = healthToneClasses(artifact.health.status);
  const metrics = [
    {
      label: "Completed",
      value: artifact.metrics.completedTasks,
      icon: CheckCircle2,
    },
    {
      label: "Decisions",
      value: artifact.metrics.decisionsMade,
      icon: MessageSquareQuote,
    },
    {
      label: "Overdue",
      value: artifact.metrics.overdueTasks,
      icon: Clock3,
    },
    {
      label: "Projects",
      value: artifact.metrics.activeProjects,
      icon: BarChart3,
    },
  ];

  return (
    <CardShell>
      <div className="space-y-6 p-4 sm:space-y-7 sm:p-7 lg:p-9">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="w-fit border-primary/25 bg-primary/15 text-primary">
                Workspace Snapshot
              </Badge>
              <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-white/45">
                Momentum card
              </span>
            </div>
            <div>
              <h2 className="max-w-2xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                {artifact.workspace.name} is moving with clarity.
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/62 sm:text-base">
                A polished readout of delivery momentum, decisions captured, and
                pressure signals.
              </p>
            </div>
          </div>
          <div className="rounded-[1rem] border border-white/10 bg-white/[0.045] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <p className="text-xs uppercase tracking-[0.18em] text-white/40">
              Period
            </p>
            <p className="mt-1 text-sm font-medium text-white">
              {artifact.range.label}
            </p>
          </div>
        </header>

        <section className="grid gap-3 lg:grid-cols-[1.05fr_0.95fr] lg:gap-4">
          <div
            className={cn(
              "relative overflow-hidden rounded-[1.1rem] border border-white/10 bg-gradient-to-br p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:p-5",
              tone.glow,
            )}
          >
            <div className={cn("absolute inset-x-0 top-0 h-1", tone.line)} />
            <div className="absolute right-5 top-5 h-20 w-20 rounded-full border border-white/10" />
            <div className="absolute right-8 top-8 h-14 w-14 rounded-full border border-white/10" />
            <div className="relative z-10">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/42">
                    Health score
                  </p>
                  <div className="mt-3 flex items-end gap-3">
                    <p className="text-6xl font-semibold leading-none tracking-[-0.07em]">
                      {artifact.health.score}
                    </p>
                    <span className="pb-2 text-sm text-white/42">/100</span>
                  </div>
                </div>
                <Badge variant="outline" className={cn("border", tone.badge)}>
                  {artifact.health.status}
                </Badge>
              </div>
              <p className="mt-5 max-w-xl text-sm leading-6 text-white/68">
                {artifact.health.summary}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <div
                  key={metric.label}
                  className="rounded-[1rem] border border-white/10 bg-white/[0.045] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] sm:p-4"
                >
                  <Icon className="h-4 w-4 text-primary" />
                  <p className="mt-4 text-3xl font-semibold tracking-[-0.04em]">
                    {metric.value}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-white/42">
                    {metric.label}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-[1.1rem] border border-white/10 bg-black/18 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium text-white">Highlights</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {artifact.highlights.map((highlight) => (
              <div
                key={highlight}
                className="flex items-start gap-3 rounded-[0.95rem] border border-white/10 bg-white/[0.035] p-3 text-sm leading-6 text-white/70"
              >
                <CircleDot className="mt-1 h-3.5 w-3.5 shrink-0 text-primary" />
                <span>{highlight}</span>
              </div>
            ))}
          </div>
        </section>

        <footer className="flex flex-col gap-3 border-t border-white/10 pt-5 text-xs text-white/42 sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Generated in Crevo
          </span>
          <span>{artifact.metrics.completionRate}% completion overall</span>
        </footer>
      </div>
    </CardShell>
  );
}

export function ShareArtifactGuide() {
  return (
    <Card className="app-surface">
      <CardContent className="grid gap-4 p-4 sm:p-5 lg:grid-cols-3 lg:p-6">
        <div className="flex gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-muted/30">
            <MessageSquareQuote className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium">Curated, not cluttered</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Cards summarize outcomes, not raw dashboard chrome.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-muted/30">
            <UsersRound className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium">Workspace-safe</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Data stays scoped to the current authenticated workspace.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-muted/30">
            <ArrowUpRight className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium">Ready to export</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Download, copy, or share a clean PNG without the surrounding app
              chrome.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function RestrictedSnapshotState() {
  return (
    <Empty className="app-surface border-dashed py-12">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <BadgeCheck className="size-4" />
        </EmptyMedia>
        <EmptyTitle>Workspace Snapshot is admin-only for now</EmptyTitle>
        <EmptyDescription>
          This card includes workspace-wide performance signals, so v1 keeps it
          visible to admins and super admins.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
