import {
  canAnalyzeFeedback,
  canEditFeedbackStatus,
  canExportReports,
  canInviteMembers,
  canManageIntegrations,
  canManageWorkspace,
  canUseAskLoop,
  canViewDashboard,
} from "@/lib/permissions";

describe("permissions", () => {
  it("restricts workspace and invite management to owners", () => {
    expect(canManageWorkspace("OWNER")).toBe(true);
    expect(canManageWorkspace("ANALYST")).toBe(false);
    expect(canInviteMembers("VIEWER")).toBe(false);
    expect(canManageIntegrations("OWNER")).toBe(true);
    expect(canManageIntegrations("ANALYST")).toBe(false);
  });

  it("allows analysts to analyze, export, and edit feedback status", () => {
    expect(canAnalyzeFeedback("ANALYST")).toBe(true);
    expect(canExportReports("ANALYST")).toBe(true);
    expect(canEditFeedbackStatus("ANALYST")).toBe(true);
    expect(canAnalyzeFeedback("VIEWER")).toBe(false);
    expect(canExportReports("VIEWER")).toBe(false);
  });

  it("allows all roles to view the dashboard and use Ask LOOP", () => {
    for (const role of ["OWNER", "ANALYST", "VIEWER"] as const) {
      expect(canViewDashboard(role)).toBe(true);
      expect(canUseAskLoop(role)).toBe(true);
    }
  });
});
