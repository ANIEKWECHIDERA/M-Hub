/// <reference types="jest" />

jest.mock("../../lib/prisma", () => ({
  prisma: {
    $queryRaw: jest.fn(),
  },
}));

import { prisma } from "../../lib/prisma";
import {
  normalizeShareArtifactRange,
  ShareArtifactService,
} from "../shareArtifact.service";

const mockedPrisma = prisma as unknown as {
  $queryRaw: jest.Mock;
};

function getSqlText(callIndex: number) {
  const strings = mockedPrisma.$queryRaw.mock.calls[callIndex]?.[0];
  return Array.isArray(strings) ? strings.join(" ") : String(strings);
}

describe("ShareArtifactService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("validates date ranges for share artifacts", () => {
    expect(() =>
      normalizeShareArtifactRange({
        from: "2026-04-14T00:00:00.000Z",
        to: "2026-04-01T00:00:00.000Z",
      }),
    ).toThrow("from must be before to");

    expect(() =>
      normalizeShareArtifactRange({
        from: "2026-01-01T00:00:00.000Z",
        to: "2026-04-14T00:00:00.000Z",
      }),
    ).toThrow("Range cannot be longer than 90 days");
  });

  it("returns a workspace-scoped decision timeline from tagged chat data", async () => {
    mockedPrisma.$queryRaw
      .mockResolvedValueOnce([
        {
          message_id: "message-1",
          body: "Ship the beta invite flow this week.",
          created_at: new Date("2026-04-10T12:00:00.000Z"),
          conversation_id: "conversation-1",
          conversation_name: "General",
          contributor_user_id: "user-2",
          contributor_name: "Ada Lovelace",
          contributor_avatar: null,
          tags: ["decision", "action-item", "update"],
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "company-1",
          name: "Crevo Studio",
          logo_url: null,
        },
      ]);

    const artifact = await ShareArtifactService.getDecisionTimeline({
      companyId: "company-1",
      userId: "user-1",
      from: "2026-04-01T00:00:00.000Z",
      to: "2026-04-14T00:00:00.000Z",
      limit: "6",
    });

    expect(artifact.artifactType).toBe("decision-timeline");
    expect(artifact.workspace.name).toBe("Crevo Studio");
    expect(artifact.items).toHaveLength(1);
    expect(artifact.items[0]).toMatchObject({
      messageId: "message-1",
      decisionText: "Ship the beta invite flow this week.",
      primaryTag: "decision",
      tags: ["decision", "action-item"],
      contributor: {
        id: "user-2",
        name: "Ada Lovelace",
      },
      approvalState: null,
    });
    expect(artifact.summary).toEqual({
      decisions: 1,
      actionItems: 1,
      blockers: 0,
      contributors: 1,
    });

    const decisionSql = getSqlText(0);
    expect(decisionSql).toContain("m.company_id");
    expect(decisionSql).toContain("c.company_id");
    expect(decisionSql).toContain("cm.user_id");
    expect(decisionSql).toContain("cm.removed_at IS NULL");
  });

  it("returns a compact workspace snapshot with period metrics", async () => {
    mockedPrisma.$queryRaw
      .mockResolvedValueOnce([
        {
          id: "company-1",
          name: "Crevo Studio",
          logo_url: "https://example.com/logo.png",
        },
      ])
      .mockResolvedValueOnce([
        {
          completed_tasks: 8,
          overdue_tasks: 6,
          total_tasks: 12,
          all_completed_tasks: 9,
          decisions_made: 3,
          blockers_raised: 1,
          active_projects: 2,
        },
      ]);

    const artifact = await ShareArtifactService.getWorkspaceSnapshot({
      companyId: "company-1",
      from: "2026-04-01T00:00:00.000Z",
      to: "2026-04-14T00:00:00.000Z",
    });

    expect(artifact.artifactType).toBe("workspace-snapshot");
    expect(artifact.workspace).toEqual({
      id: "company-1",
      name: "Crevo Studio",
      logoUrl: "https://example.com/logo.png",
    });
    expect(artifact.metrics).toMatchObject({
      completedTasks: 8,
      overdueTasks: 6,
      decisionsMade: 3,
      blockersRaised: 1,
      activeProjects: 2,
      completionRate: 75,
    });
    expect(artifact.health.status).toBe("At Risk");
    expect(artifact.highlights.length).toBeGreaterThanOrEqual(3);

    const metricsSql = getSqlText(1);
    expect(metricsSql).toContain("WHERE t.company_id");
    expect(metricsSql).toContain("m.company_id");
    expect(metricsSql).toContain("p.company_id");
  });
});
