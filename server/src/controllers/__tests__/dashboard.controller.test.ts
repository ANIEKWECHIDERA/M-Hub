/// <reference types="jest" />

import { DashboardController } from "../dashboard.controller";
import { RetentionService } from "../../services/retention.service";

jest.mock("../../services/retention.service", () => ({
  RetentionService: {
    getDashboardSnapshot: jest.fn(),
  },
}));

const mockedRetentionService =
  RetentionService as jest.Mocked<typeof RetentionService>;

const createResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("DashboardController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("scopes retention snapshot to the authenticated user and workspace", async () => {
    const req: any = {
      user: {
        id: "user-1",
        company_id: "company-1",
        access: "team_member",
      },
    };
    const res = createResponse();

    mockedRetentionService.getDashboardSnapshot.mockResolvedValue({
      dailyFocus: { items: [] },
      decisionFeed: {
        items: [],
        counts: { all: 0, decision: 0, blocker: 0, "action-item": 0 },
      },
      workspaceHealth: null,
    });

    await DashboardController.retention(req, res);

    expect(mockedRetentionService.getDashboardSnapshot).toHaveBeenCalledWith({
      companyId: "company-1",
      userId: "user-1",
      access: "team_member",
    });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        dailyFocus: { items: [] },
      }),
    );
  });

  it("returns 401 when the request context is incomplete", async () => {
    const req: any = { user: { access: "member" } };
    const res = createResponse();

    await DashboardController.retention(req, res);

    expect(mockedRetentionService.getDashboardSnapshot).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
