/// <reference types="jest" />

import { ShareArtifactController } from "../shareArtifact.controller";
import { ShareArtifactService } from "../../services/shareArtifact.service";

jest.mock("../../services/shareArtifact.service", () => ({
  ShareArtifactValidationError: class ShareArtifactValidationError extends Error {
    status = 400;
  },
  ShareArtifactService: {
    getDecisionTimeline: jest.fn(),
    getWorkspaceSnapshot: jest.fn(),
  },
}));

const mockedShareArtifactService =
  ShareArtifactService as jest.Mocked<typeof ShareArtifactService>;

const createResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("ShareArtifactController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("scopes decision timeline requests to the authenticated workspace and user", async () => {
    const req: any = {
      user: {
        id: "user-1",
        company_id: "company-1",
        access: "team_member",
      },
      query: {
        from: "2026-04-01T00:00:00.000Z",
        to: "2026-04-14T00:00:00.000Z",
        conversationId: "conversation-1",
        limit: "8",
      },
    };
    const res = createResponse();

    mockedShareArtifactService.getDecisionTimeline.mockResolvedValue({
      artifactType: "decision-timeline",
      workspace: { id: "company-1", name: "Crevo", logoUrl: null },
      range: {
        from: "2026-04-01T00:00:00.000Z",
        to: "2026-04-14T00:00:00.000Z",
        label: "Apr 1 - Apr 14, 2026",
      },
      summary: {
        decisions: 0,
        actionItems: 0,
        blockers: 0,
        contributors: 0,
      },
      items: [],
      generatedAt: "2026-04-14T00:00:00.000Z",
    });

    await ShareArtifactController.decisionTimeline(req, res);

    expect(mockedShareArtifactService.getDecisionTimeline).toHaveBeenCalledWith({
      companyId: "company-1",
      userId: "user-1",
      from: req.query.from,
      to: req.query.to,
      conversationId: req.query.conversationId,
      limit: req.query.limit,
    });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ artifactType: "decision-timeline" }),
    );
  });

  it("requires admin access for workspace snapshots", async () => {
    const req: any = {
      user: {
        id: "user-1",
        company_id: "company-1",
        access: "team_member",
      },
      query: {},
    };
    const res = createResponse();

    await ShareArtifactController.workspaceSnapshot(req, res);

    expect(mockedShareArtifactService.getWorkspaceSnapshot).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "FORBIDDEN_ACTION" }),
    );
  });

  it("allows admins to request workspace snapshots scoped to their workspace", async () => {
    const req: any = {
      user: {
        id: "user-1",
        company_id: "company-1",
        access: "admin",
      },
      query: {
        from: "2026-04-01T00:00:00.000Z",
        to: "2026-04-14T00:00:00.000Z",
      },
    };
    const res = createResponse();

    mockedShareArtifactService.getWorkspaceSnapshot.mockResolvedValue({
      artifactType: "workspace-snapshot",
      workspace: { id: "company-1", name: "Crevo", logoUrl: null },
      range: {
        from: "2026-04-01T00:00:00.000Z",
        to: "2026-04-14T00:00:00.000Z",
        label: "Apr 1 - Apr 14, 2026",
      },
      metrics: {
        completedTasks: 0,
        overdueTasks: 0,
        decisionsMade: 0,
        blockersRaised: 0,
        activeProjects: 0,
        completionRate: 100,
      },
      health: {
        score: 100,
        status: "Healthy",
        summary: "Healthy workspace",
        breakdown: [],
        metrics: {
          totalTasks: 0,
          completedTasks: 0,
          overdueTasks: 0,
          overloadedMembers: 0,
          behindMembers: 0,
          blockerSignals: 0,
          completionRate: 100,
        },
      },
      highlights: [],
      generatedAt: "2026-04-14T00:00:00.000Z",
    });

    await ShareArtifactController.workspaceSnapshot(req, res);

    expect(mockedShareArtifactService.getWorkspaceSnapshot).toHaveBeenCalledWith({
      companyId: "company-1",
      from: req.query.from,
      to: req.query.to,
    });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ artifactType: "workspace-snapshot" }),
    );
  });
});
