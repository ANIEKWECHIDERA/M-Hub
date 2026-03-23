import { Fragment } from "react";
import { formatDistanceToNowStrict, format, isPast, isToday } from "date-fns";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CircleDot,
  FileText,
  HelpCircle,
  MessageSquareQuote,
  Sparkles,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  DailyFocusItem,
  DecisionFeedItem,
  WorkspaceHealthScore,
} from "@/Types/types";
import { cn } from "@/lib/utils";

const tagBadgeClasses: Record<string, string> = {
  decision: "border-sky-200 bg-sky-100 text-sky-800",
  "action-item": "border-amber-200 bg-amber-100 text-amber-800",
  blocker: "border-rose-200 bg-rose-100 text-rose-800",
  update: "border-emerald-200 bg-emerald-100 text-emerald-800",
  question: "border-violet-200 bg-violet-100 text-violet-800",
  "follow-up": "border-slate-200 bg-slate-100 text-slate-800",
};

const urgencyBadgeClasses: Record<string, string> = {
  overdue: "border-rose-200 bg-rose-100 text-rose-800",
  today: "border-amber-200 bg-amber-100 text-amber-800",
  soon: "border-sky-200 bg-sky-100 text-sky-800",
  watch: "border-slate-200 bg-slate-100 text-slate-800",
};

function formatFocusDueLabel(item: DailyFocusItem) {
  if (!item.dueAt) {
    return item.statusLabel;
  }

  const dueDate = new Date(item.dueAt);
  if (isPast(dueDate) && !isToday(dueDate)) {
    return `Overdue since ${format(dueDate, "MMM d")}`;
  }
  if (isToday(dueDate)) {
    return `Due today`;
  }

  return `Due ${formatDistanceToNowStrict(dueDate, { addSuffix: true })}`;
}

function FocusIcon({ kind }: { kind: DailyFocusItem["kind"] }) {
  switch (kind) {
    case "blocker":
      return <AlertTriangle className="h-4 w-4 text-rose-600" />;
    case "action-item":
      return <CheckCircle2 className="h-4 w-4 text-amber-600" />;
    case "decision":
      return <MessageSquareQuote className="h-4 w-4 text-sky-600" />;
    default:
      return <CalendarClock className="h-4 w-4 text-foreground/70" />;
  }
}

function getHealthStatusMeta(status?: WorkspaceHealthScore["status"]) {
  switch (status) {
    case "Healthy":
      return {
        icon: CheckCircle2,
        badgeClass: "text-emerald-700 border-emerald-200 bg-emerald-100",
      };
    case "At Risk":
      return {
        icon: AlertTriangle,
        badgeClass: "text-amber-700 border-amber-200 bg-amber-100",
      };
    case "Critical":
      return {
        icon: CircleDot,
        badgeClass: "text-rose-700 border-rose-200 bg-rose-100",
      };
    default:
      return {
        icon: CircleDot,
        badgeClass: "text-slate-700 border-slate-200 bg-slate-100",
      };
  }
}

export function DailyFocusCard({
  items,
  loading,
  error,
  onOpenTask,
  onOpenDecision,
}: {
  items: DailyFocusItem[];
  loading: boolean;
  error: string | null;
  onOpenTask: (item: DailyFocusItem) => void;
  onOpenDecision: (item: DailyFocusItem) => void;
}) {
  return (
    <Card className="app-surface">
      <CardHeader className="space-y-1 p-3 sm:p-4 lg:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5">
              <CardTitle className="text-base font-semibold sm:text-lg">
                Daily Focus
              </CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <HelpCircle className="h-3.5 w-3.5" />
                    <span className="sr-only">What Daily Focus means</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-[260px] text-left leading-relaxed">
                  Daily Focus pulls together your most urgent tasks, nearby deadlines,
                  blockers, and relevant tagged decisions so you can see what
                  deserves attention first.
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-xs text-muted-foreground sm:text-sm">
              The handful of tasks and decisions most likely to move your day.
            </p>
          </div>
          <Sparkles className="mt-1 h-4 w-4 text-amber-500" />
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0 lg:p-5 lg:pt-0">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="rounded-2xl border border-border/70 bg-muted/20 p-3"
              >
                <Skeleton className="h-4 w-40" />
                <Skeleton className="mt-2 h-3 w-full" />
                <Skeleton className="mt-2 h-3 w-2/3" />
              </div>
            ))}
          </div>
        ) : error ? (
          <Empty className="border-dashed py-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <AlertTriangle className="size-4" />
              </EmptyMedia>
              <EmptyTitle>Daily Focus is unavailable</EmptyTitle>
              <EmptyDescription>{error}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : items.length === 0 ? (
          <Empty className="border-dashed py-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CircleDot className="size-4" />
              </EmptyMedia>
              <EmptyTitle>You&apos;re clear for now</EmptyTitle>
              <EmptyDescription>
                No urgent tasks or decision signals need your attention right now.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const action = item.kind === "task" ? onOpenTask : onOpenDecision;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => action(item)}
                  className="w-full rounded-2xl border border-border/70 bg-card/80 p-3 text-left transition-all duration-200 hover:-translate-y-[1px] hover:border-foreground/15 hover:shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-muted/40">
                      <FocusIcon kind={item.kind} />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold sm:text-base">
                          {item.title}
                        </p>
                        <Badge
                          variant="outline"
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide sm:text-[11px]",
                            item.tag
                              ? tagBadgeClasses[item.tag]
                              : urgencyBadgeClasses[item.urgency],
                          )}
                        >
                          {item.tag
                            ? item.tag.replace("-", " ")
                            : item.urgency}
                        </Badge>
                      </div>
                      {item.description && (
                        <p className="line-clamp-2 text-xs text-muted-foreground sm:text-sm">
                          {item.description}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground sm:text-xs">
                        <span>{formatFocusDueLabel(item)}</span>
                        {item.project && (
                          <Fragment>
                            <span className="text-border">•</span>
                            <span>{item.project.title}</span>
                          </Fragment>
                        )}
                        {item.conversation && (
                          <Fragment>
                            <span className="text-border">•</span>
                            <span>{item.conversation.name}</span>
                          </Fragment>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function DecisionFeedCard({
  items,
  counts,
  loading,
  error,
  activeFilter,
  onFilterChange,
  onOpenItem,
}: {
  items: DecisionFeedItem[];
  counts: Record<string, number>;
  loading: boolean;
  error: string | null;
  activeFilter: "all" | "decision" | "action-item" | "blocker";
  onFilterChange: (filter: "all" | "decision" | "action-item" | "blocker") => void;
  onOpenItem: (item: DecisionFeedItem) => void;
}) {
  const filters = [
    { value: "all", label: "All" },
    { value: "decision", label: "Decisions" },
    { value: "action-item", label: "Action Items" },
    { value: "blocker", label: "Blockers" },
  ] as const;

  return (
    <Card className="app-surface">
      <CardHeader className="space-y-3 p-3 sm:p-4 lg:p-5">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <CardTitle className="text-base font-semibold sm:text-lg">
              Decision Feed
            </CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                  <span className="sr-only">What Decision Feed means</span>
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-[260px] text-left leading-relaxed">
                Decision Feed surfaces the important tagged moments from chat,
                like decisions, blockers, and action items, without making you
                read the full conversation history.
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Important tagged chat outcomes, without the surrounding thread noise.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <Button
              key={filter.value}
              type="button"
              variant={activeFilter === filter.value ? "default" : "outline"}
              size="sm"
              className="h-8 rounded-full px-3 text-[11px] sm:text-xs"
              onClick={() => onFilterChange(filter.value)}
            >
              {filter.label}
              <span className="ml-2 rounded-full bg-background/15 px-1.5 py-0.5 text-[10px]">
                {counts[filter.value] ?? 0}
              </span>
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0 lg:p-5 lg:pt-0">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="rounded-2xl border border-border/70 bg-muted/20 p-3"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="mt-3 h-3 w-full" />
                <Skeleton className="mt-2 h-3 w-4/5" />
              </div>
            ))}
          </div>
        ) : error ? (
          <Empty className="border-dashed py-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <AlertTriangle className="size-4" />
              </EmptyMedia>
              <EmptyTitle>Decision Feed is unavailable</EmptyTitle>
              <EmptyDescription>{error}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : items.length === 0 ? (
          <Empty className="border-dashed py-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileText className="size-4" />
              </EmptyMedia>
              <EmptyTitle>No tagged decisions yet</EmptyTitle>
              <EmptyDescription>
                When the team tags a decision, blocker, or action item in chat, it
                will show up here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onOpenItem(item)}
                className="w-full rounded-2xl border border-border/70 bg-card/80 p-3 text-left transition-all duration-200 hover:-translate-y-[1px] hover:border-foreground/15 hover:shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={item.sender.avatar ?? undefined} />
                    <AvatarFallback>
                      {item.sender.name
                        .split(" ")
                        .map((part) => part[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold sm:text-base">
                        {item.conversationName}
                      </p>
                      <Badge
                        variant="outline"
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide sm:text-[11px]",
                          tagBadgeClasses[item.primaryTag],
                        )}
                      >
                        {item.primaryTag.replace("-", " ")}
                      </Badge>
                    </div>
                    <p className="line-clamp-2 text-xs text-muted-foreground sm:text-sm">
                      {item.preview}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground sm:text-xs">
                      <span>{item.sender.name}</span>
                      <span className="text-border">•</span>
                      <span>
                        {formatDistanceToNowStrict(new Date(item.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function WorkspaceHealthCard({
  score,
  loading,
  error,
}: {
  score: WorkspaceHealthScore | null;
  loading: boolean;
  error: string | null;
}) {
  const healthMeta = getHealthStatusMeta(score?.status);
  const HealthIcon = healthMeta.icon;

  return (
    <Card className="app-surface">
      <CardHeader className="space-y-1 p-3 sm:p-4 lg:p-5">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-semibold sm:text-lg">
            Workspace Health
          </CardTitle>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
              >
                <HelpCircle className="h-3.5 w-3.5" />
                <span className="sr-only">How workspace health is calculated</span>
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-[260px] text-left leading-relaxed">
              Healthy: 75+. At Risk: 45-74. Critical: below 45. The score is a weighted signal based on overdue tasks, blockers, overloaded teammates, and completion rate.
            </TooltipContent>
          </Tooltip>
        </div>
        <p className="text-xs text-muted-foreground sm:text-sm">
          A quick operational read on task pressure, blockers, and delivery flow.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 p-3 pt-0 sm:p-4 sm:pt-0 lg:p-5 lg:pt-0">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-4 w-3/4" />
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          </div>
        ) : error ? (
          <Empty className="border-dashed py-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <AlertTriangle className="size-4" />
              </EmptyMedia>
              <EmptyTitle>Health score unavailable</EmptyTitle>
              <EmptyDescription>{error}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : !score ? (
          <Empty className="border-dashed py-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CircleDot className="size-4" />
              </EmptyMedia>
              <EmptyTitle>Health score hidden</EmptyTitle>
              <EmptyDescription>
                Workspace health is available to admins and super admins.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <div className="rounded-2xl border border-border/70 bg-muted/20 p-3.5 sm:p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-background/80">
                    <HealthIcon className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-3xl font-bold leading-none sm:text-4xl">{score.score}</p>
                      <Badge
                        variant="outline"
                        className={cn("rounded-full px-2.5 py-1 text-[10px] font-medium sm:text-xs", healthMeta.badgeClass)}
                      >
                        {score.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                      weighted score out of 100
                    </p>
                  </div>
                </div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{score.summary}</p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {score.breakdown.map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-border/70 bg-card/70 p-3"
                >
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground sm:text-xs">
                    {item.label}
                  </p>
                  <p
                    className={cn(
                      "mt-2 text-lg font-semibold",
                      item.tone === "good" && "text-emerald-700",
                      item.tone === "warning" && "text-amber-700",
                      item.tone === "critical" && "text-rose-700",
                    )}
                  >
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
