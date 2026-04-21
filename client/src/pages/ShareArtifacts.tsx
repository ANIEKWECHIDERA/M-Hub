import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toBlob } from "html-to-image";
import { useSearchParams } from "react-router-dom";
import {
  Camera,
  CalendarDays,
  Check,
  Clipboard,
  Download,
  MessageSquareQuote,
  RefreshCw,
  Share2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { shareArtifactAPI } from "@/api/shareArtifact.api";
import {
  DecisionTimelineShareCard,
  RestrictedSnapshotState,
  ShareArtifactError,
  ShareArtifactGuide,
  ShareArtifactSkeleton,
  WorkspaceSnapshotShareCard,
} from "@/components/share/ShareArtifactCards";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthContext } from "@/context/AuthContext";
import type {
  DecisionTimelineArtifact,
  WorkspaceSnapshotArtifact,
} from "@/Types/types";
import { cn } from "@/lib/utils";

type ArtifactType = "decision-timeline" | "workspace-snapshot";
type RangePreset = "7d" | "14d" | "30d";
type ExportAction = "download" | "copy" | "share" | null;

type ArtifactState =
  | { type: "decision-timeline"; data: DecisionTimelineArtifact }
  | { type: "workspace-snapshot"; data: WorkspaceSnapshotArtifact };

const rangeOptions: Array<{
  value: RangePreset;
  label: string;
  description: string;
  days: number;
}> = [
  {
    value: "7d",
    label: "7 days",
    description: "latest pulse",
    days: 7,
  },
  {
    value: "14d",
    label: "14 days",
    description: "recent sprint",
    days: 14,
  },
  {
    value: "30d",
    label: "30 days",
    description: "monthly view",
    days: 30,
  },
];

function buildRange(preset: RangePreset) {
  const option = rangeOptions.find((item) => item.value === preset) ?? rangeOptions[0];
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - option.days);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

function canViewWorkspaceSnapshot(access?: string | null) {
  return access === "admin" || access === "superAdmin";
}

function getArtifactFileName(artifact: ArtifactState | null) {
  if (!artifact) {
    return "crevo-share-card.png";
  }

  const workspace = artifact.data.workspace.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const suffix =
    artifact.type === "decision-timeline"
      ? "decision-timeline"
      : "workspace-snapshot";

  return `crevo-${workspace || "workspace"}-${suffix}.png`;
}

function getArtifactCaption(artifact: ArtifactState | null) {
  if (!artifact) {
    return "A shareable Crevo work artifact.";
  }

  if (artifact.type === "decision-timeline") {
    return `${artifact.data.workspace.name} decision timeline, packaged by Crevo for ${artifact.data.range.label}.`;
  }

  return `${artifact.data.workspace.name} workspace snapshot: ${artifact.data.metrics.completedTasks} tasks completed, ${artifact.data.metrics.decisionsMade} decisions captured, ${artifact.data.health.status.toLowerCase()} health.`;
}

export default function ShareArtifacts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { idToken, authStatus } = useAuthContext();
  const initialType =
    searchParams.get("type") === "workspace-snapshot"
      ? "workspace-snapshot"
      : "decision-timeline";
  const [artifactType, setArtifactType] =
    useState<ArtifactType>(initialType);
  const [rangePreset, setRangePreset] = useState<RangePreset>("7d");
  const [artifact, setArtifact] = useState<ArtifactState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [exportAction, setExportAction] = useState<ExportAction>(null);
  const [copySucceeded, setCopySucceeded] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  const range = useMemo(() => buildRange(rangePreset), [rangePreset]);
  const conversationId = searchParams.get("conversationId") ?? undefined;
  const snapshotAllowed = canViewWorkspaceSnapshot(authStatus?.access);
  const isSnapshotBlocked =
    artifactType === "workspace-snapshot" && !snapshotAllowed;
  const canExport =
    !loading &&
    !error &&
    !isSnapshotBlocked &&
    Boolean(artifact) &&
    (artifact?.type !== "decision-timeline" || artifact.data.items.length > 0);

  const createArtifactBlob = useCallback(async () => {
    if (!captureRef.current || !artifact) {
      throw new Error("No share card is ready to export yet.");
    }

    const blob = await toBlob(captureRef.current, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: "#11131d",
      skipAutoScale: false,
    });

    if (!blob) {
      throw new Error("Could not render this share card.");
    }

    return blob;
  }, [artifact]);

  const selectArtifactType = useCallback(
    (nextType: ArtifactType) => {
      setArtifactType(nextType);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("type", nextType);
      if (nextType !== "decision-timeline") {
        nextParams.delete("conversationId");
      }
      setSearchParams(nextParams, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const handleDownload = useCallback(async () => {
    setExportAction("download");
    try {
      const blob = await createArtifactBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = getArtifactFileName(artifact);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success("Share card downloaded");
    } catch (nextError) {
      toast.error(
        nextError instanceof Error
          ? nextError.message
          : "Could not download share card",
      );
    } finally {
      setExportAction(null);
    }
  }, [artifact, createArtifactBlob]);

  const handleCopyImage = useCallback(async () => {
    setExportAction("copy");
    setCopySucceeded(false);
    try {
      const blob = await createArtifactBlob();

      if (!navigator.clipboard || typeof ClipboardItem === "undefined") {
        await navigator.clipboard?.writeText(getArtifactCaption(artifact));
        throw new Error(
          "Image copy is not available in this browser. Caption copied instead.",
        );
      }

      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      setCopySucceeded(true);
      toast.success("Share card copied");
      window.setTimeout(() => setCopySucceeded(false), 1800);
    } catch (nextError) {
      toast.error(
        nextError instanceof Error
          ? nextError.message
          : "Could not copy share card",
      );
    } finally {
      setExportAction(null);
    }
  }, [artifact, createArtifactBlob]);

  const handleNativeShare = useCallback(async () => {
    setExportAction("share");
    try {
      const blob = await createArtifactBlob();
      const file = new File([blob], getArtifactFileName(artifact), {
        type: "image/png",
      });
      const shareData = {
        title: "Crevo share card",
        text: getArtifactCaption(artifact),
        files: [file],
      };

      if (navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
        toast.success("Share sheet opened");
      } else {
        await navigator.clipboard?.writeText(getArtifactCaption(artifact));
        toast.success("Caption copied. Image sharing is not available here.");
      }
    } catch (nextError) {
      const message =
        nextError instanceof Error ? nextError.message : "Could not share card";
      if (!message.toLowerCase().includes("abort")) {
        toast.error(message);
      }
    } finally {
      setExportAction(null);
    }
  }, [artifact, createArtifactBlob]);

  useEffect(() => {
    if (!idToken || isSnapshotBlocked) {
      setArtifact(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const request =
      artifactType === "decision-timeline"
        ? shareArtifactAPI
            .decisionTimeline(idToken, { ...range, conversationId, limit: 12 })
            .then((data) => ({
              type: "decision-timeline" as const,
              data,
            }))
        : shareArtifactAPI.workspaceSnapshot(idToken, range).then((data) => ({
            type: "workspace-snapshot" as const,
            data,
          }));

    request
      .then((nextArtifact) => {
        if (!cancelled) {
          setArtifact(nextArtifact);
        }
      })
      .catch((nextError: unknown) => {
        if (!cancelled) {
          setArtifact(null);
          setError(
            nextError instanceof Error
              ? nextError.message
              : "Could not load share preview",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    artifactType,
    conversationId,
    idToken,
    isSnapshotBlocked,
    range,
    refreshNonce,
  ]);

  return (
    <div className="min-h-[calc(100vh-5rem)] space-y-5 p-3 sm:p-5 lg:p-7">
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24 }}
        className="relative overflow-hidden rounded-[1.1rem] border border-border/35 bg-card/92 p-4 shadow-[var(--shadow-card)] sm:p-6 lg:p-7"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.15),transparent_34%),linear-gradient(rgba(255,255,255,0.028)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.028)_1px,transparent_1px)] bg-[size:auto,36px_36px,36px_36px]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/55 to-transparent" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Share-worthy work artifacts
            </div>
            <h1 className="text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
              Turn real work into something worth showing off.
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
              Preview polished Crevo cards built from decisions, task momentum,
              blockers, and workspace health, then export the clean card when it
              is ready.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setRefreshNonce((value) => value + 1)}
            disabled={loading || isSnapshotBlocked}
            className="w-full gap-2 sm:w-auto"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh preview
          </Button>
        </div>
      </motion.section>

      <Card className="app-surface">
        <CardContent className="space-y-4 p-3 sm:p-4 lg:p-5">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                {
                  value: "decision-timeline" as const,
                  label: "Decision Timeline",
                  description: "Best for showing clarity from chat",
                  icon: MessageSquareQuote,
                },
                {
                  value: "workspace-snapshot" as const,
                  label: "Workspace Snapshot",
                  description: "Best for performance and momentum",
                  icon: Camera,
                },
              ].map((item) => {
                const Icon = item.icon;
                const active = artifactType === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => selectArtifactType(item.value)}
                    className={cn(
                      "relative overflow-hidden rounded-[0.9rem] border p-3 text-left transition-all duration-200",
                      active
                        ? "border-primary/35 bg-primary/10 shadow-[0_14px_38px_hsl(var(--primary)/0.12)]"
                        : "border-border/40 bg-muted/12 hover:border-primary/20 hover:bg-primary/5",
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="artifact-type-glow"
                        className="absolute inset-0 bg-gradient-to-br from-primary/12 to-transparent"
                        transition={{ duration: 0.18 }}
                      />
                    )}
                    <span className="relative flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.8rem] border border-border/35 bg-background/70">
                        <Icon className="h-4 w-4 text-primary" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold">
                          {item.label}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                          {item.description}
                        </span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2 rounded-[0.9rem] border border-border/40 bg-muted/12 p-2">
              {rangeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRangePreset(option.value)}
                  className={cn(
                    "rounded-[0.7rem] px-3 py-2 text-left text-xs transition-colors",
                    rangePreset === option.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-primary/10 hover:text-foreground",
                  )}
                >
                  <span className="flex items-center gap-1.5 font-medium">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {option.label}
                  </span>
                  <span className="block text-[10px] opacity-75">
                    {option.description}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <ShareArtifactGuide />

      <Card className="app-surface overflow-hidden">
        <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4 lg:p-5">
          <div>
            <p className="text-sm font-semibold">Export preview</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">
              Export keeps the card clean: no toolbar, no sidebar, just the
              artifact.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={handleCopyImage}
              disabled={!canExport || exportAction !== null}
              className="gap-2"
            >
              {copySucceeded ? (
                <Check className="h-4 w-4" />
              ) : (
                <Clipboard className="h-4 w-4" />
              )}
              {exportAction === "copy" ? "Copying..." : "Copy image"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleNativeShare}
              disabled={!canExport || exportAction !== null}
              className="gap-2"
            >
              <Share2 className="h-4 w-4" />
              {exportAction === "share" ? "Opening..." : "Share"}
            </Button>
            <Button
              type="button"
              onClick={handleDownload}
              disabled={!canExport || exportAction !== null}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {exportAction === "download" ? "Exporting..." : "Download PNG"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AnimatePresence mode="wait">
        <motion.div key={`${artifactType}-${rangePreset}`} layout>
          {isSnapshotBlocked ? (
            <RestrictedSnapshotState />
          ) : loading ? (
            <ShareArtifactSkeleton />
          ) : error ? (
            <ShareArtifactError message={error} />
          ) : artifact?.type === "decision-timeline" ? (
            <div ref={captureRef}>
              <DecisionTimelineShareCard artifact={artifact.data} />
            </div>
          ) : artifact?.type === "workspace-snapshot" ? (
            <div ref={captureRef}>
              <WorkspaceSnapshotShareCard artifact={artifact.data} />
            </div>
          ) : (
            <ShareArtifactSkeleton />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
