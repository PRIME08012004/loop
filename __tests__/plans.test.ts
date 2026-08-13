import {
  canAccessFeature,
  effectivePlan,
  formatInr,
  getPlan,
  hasActivePaidPlan,
  isPaidPlan,
  planAllowsIntegrations,
  requiredPlanFor,
} from "@/lib/plans";

describe("getPlan", () => {
  it("returns the matching plan definition", () => {
    expect(getPlan("PRO").id).toBe("PRO");
    expect(getPlan("BEGINNER").priceInr).toBe(1499);
  });

  it("falls back to FREE for unknown or empty values", () => {
    expect(getPlan(undefined).id).toBe("FREE");
    expect(getPlan(null).id).toBe("FREE");
    expect(getPlan("NOT_A_PLAN").id).toBe("FREE");
  });
});

describe("formatInr", () => {
  it("formats whole rupee amounts for en-IN", () => {
    expect(formatInr(1499)).toMatch(/1,499/);
    expect(formatInr(0)).toMatch(/0/);
  });
});

describe("isPaidPlan / hasActivePaidPlan / effectivePlan", () => {
  it("treats FREE as unpaid", () => {
    expect(isPaidPlan("FREE")).toBe(false);
    expect(hasActivePaidPlan("FREE")).toBe(false);
  });

  it("treats paid plans without expiry as active", () => {
    expect(isPaidPlan("ADVANCED")).toBe(true);
    expect(hasActivePaidPlan("ADVANCED")).toBe(true);
    expect(effectivePlan("ADVANCED")).toBe("ADVANCED");
  });

  it("treats expired paid plans as Free", () => {
    const expired = new Date(Date.now() - 60_000);
    expect(hasActivePaidPlan("PRO", expired)).toBe(false);
    expect(effectivePlan("PRO", expired)).toBe("FREE");
  });

  it("keeps unexpired paid plans active", () => {
    const future = new Date(Date.now() + 86_400_000);
    expect(hasActivePaidPlan("BEGINNER", future.toISOString())).toBe(true);
    expect(effectivePlan("BEGINNER", future)).toBe("BEGINNER");
  });
});

describe("canAccessFeature", () => {
  it("allows Free users on dashboard and settings only", () => {
    expect(canAccessFeature("FREE", null, "dashboard")).toBe(true);
    expect(canAccessFeature("FREE", null, "settings")).toBe(true);
    expect(canAccessFeature("FREE", null, "inbox")).toBe(false);
    expect(canAccessFeature("FREE", null, "integrations")).toBe(false);
  });

  it("gates integrations behind Advanced+", () => {
    expect(canAccessFeature("BEGINNER", null, "integrations")).toBe(false);
    expect(canAccessFeature("ADVANCED", null, "integrations")).toBe(true);
    expect(planAllowsIntegrations("PRO")).toBe(true);
  });

  it("uses effective plan when subscription is expired", () => {
    const expired = new Date(Date.now() - 1);
    expect(canAccessFeature("PRO", expired, "ask")).toBe(false);
  });

  it("returns the minimum plan required for a feature", () => {
    expect(requiredPlanFor("integrations").id).toBe("ADVANCED");
    expect(requiredPlanFor("ask").id).toBe("BEGINNER");
  });
});
