/// <reference types="jest" />

import { buildWorkspaceHealthScore } from "../retention.service";

describe("buildWorkspaceHealthScore", () => {
  it("returns a healthy score for a steady workspace", () => {
    const result = buildWorkspaceHealthScore({
      totalTasks: 20,
      completedTasks: 14,
      overdueTasks: 0,
      overloadedMembers: 0,
      behindMembers: 0,
      blockerSignals: 0,
    });

    expect(result.status).toBe("Healthy");
    expect(result.score).toBeGreaterThanOrEqual(75);
  });

  it("returns a critical score when overdue work and blockers pile up", () => {
    const result = buildWorkspaceHealthScore({
      totalTasks: 24,
      completedTasks: 4,
      overdueTasks: 6,
      overloadedMembers: 3,
      behindMembers: 2,
      blockerSignals: 4,
    });

    expect(result.status).toBe("Critical");
    expect(result.score).toBeLessThan(45);
    expect(result.breakdown.some((item) => item.label === "Overdue tasks")).toBe(
      true,
    );
  });

  it("uses a calm summary for a brand-new workspace with no tracked pressure", () => {
    const result = buildWorkspaceHealthScore({
      totalTasks: 0,
      completedTasks: 0,
      overdueTasks: 0,
      overloadedMembers: 0,
      behindMembers: 0,
      blockerSignals: 0,
    });

    expect(result.summary).toContain("clear of active task pressure");
    expect(result.score).toBe(100);
  });
});
