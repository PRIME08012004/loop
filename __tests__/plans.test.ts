import {
  PLAN_GATES_OPEN,
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
    if (PLAN_GATES_OPEN) {
      expect(hasActivePaidPlan("FREE")).toBe(true);
      expect(effectivePlan("FREE")).toBe("PRO");
    } else {
      expect(hasActivePaidPlan("FREE")).toBe(false);
    }
  });

  it("treats paid plans without expiry as active", () => {
    expect(isPaidPlan("ADVANCED")).toBe(true);
    expect(hasActivePaidPlan("ADVANCED")).toBe(true);
    expect(effectivePlan("ADVANCED")).toBe(PLAN_GATES_OPEN ? "PRO" : "ADVANCED");
  });

  it("treats expired paid plans as Free (unless gates are open)", () => {
    const expired = new Date(Date.now() - 60_000);
    if (PLAN_GATES_OPEN) {
      expect(hasActivePaidPlan("PRO", expired)).toBe(true);
      expect(effectivePlan("PRO", expired)).toBe("PRO");
    } else {
      expect(hasActivePaidPlan("PRO", expired)).toBe(false);
      expect(effectivePlan("PRO", expired)).toBe("FREE");
    }
  });

  it("keeps unexpired paid plans active", () => {
    const future = new Date(Date.now() + 86_400_000);
    expect(hasActivePaidPlan("BEGINNER", future.toISOString())).toBe(true);
    expect(effectivePlan("BEGINNER", future)).toBe(PLAN_GATES_OPEN ? "PRO" : "BEGINNER");
  });
});

describe("canAccessFeature", () => {
  it("allows Free users on dashboard and settings only (or everything when gates open)", () => {
    expect(canAccessFeature("FREE", null, "dashboard")).toBe(true);
    expect(canAccessFeature("FREE", null, "settings")).toBe(true);
    expect(canAccessFeature("FREE", null, "inbox")).toBe(PLAN_GATES_OPEN);
    expect(canAccessFeature("FREE", null, "integrations")).toBe(PLAN_GATES_OPEN);
  });

  it("gates integrations behind Advanced+ (or unlocks when gates open)", () => {
    expect(canAccessFeature("BEGINNER", null, "integrations")).toBe(PLAN_GATES_OPEN);
    expect(canAccessFeature("ADVANCED", null, "integrations")).toBe(true);
    expect(planAllowsIntegrations("PRO")).toBe(true);
  });

  it("uses effective plan when subscription is expired (or unlocks when gates open)", () => {
    const expired = new Date(Date.now() - 1);
    expect(canAccessFeature("PRO", expired, "ask")).toBe(PLAN_GATES_OPEN);
  });

  it("returns the minimum plan required for a feature", () => {
    expect(requiredPlanFor("integrations").id).toBe("ADVANCED");
    expect(requiredPlanFor("ask").id).toBe("BEGINNER");
  });
});
