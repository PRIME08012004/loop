export type OrgRole = "OWNER" | "ANALYST" | "VIEWER";

export const ROLE_LABELS: Record<OrgRole, string> = {
  OWNER: "Owner",
  ANALYST: "Analyst",
  VIEWER: "Viewer",
};

export function canManageWorkspace(role: OrgRole) {
  return role === "OWNER";
}

export function canManageIntegrations(role: OrgRole) {
  return role === "OWNER";
}

export function canAnalyzeFeedback(role: OrgRole) {
  return role === "OWNER" || role === "ANALYST";
}

export function canExportReports(role: OrgRole) {
  return role === "OWNER" || role === "ANALYST";
}

export function canInviteMembers(role: OrgRole) {
  return role === "OWNER";
}

export function canEditFeedbackStatus(role: OrgRole) {
  return role === "OWNER" || role === "ANALYST";
}

export function canUseAskLoop(_role: OrgRole) {
  return true;
}

export function canViewDashboard(_role: OrgRole) {
  return true;
}

// Backward compat alias
export type AppRole = OrgRole;
