export type PlanId = "FREE" | "BEGINNER" | "ADVANCED" | "PRO";

export type PlanDefinition = {
  id: PlanId;
  name: string;
  tagline: string;
  /** Monthly price in INR (display). */
  priceInr: number;
  /** Razorpay amount in paise. */
  amountPaise: number;
  currency: "INR";
  /** OpenRouter model used for Ask LOOP, reports, and file analysis. */
  analysisModel: string;
  /** Cheaper model for bulk sentiment tagging. */
  sentimentModel: string;
  features: string[];
  limits: {
    members: number;
    feedbackItems: number;
    askLoopPerMonth: number;
    reportsPerMonth: number;
    integrations: boolean;
    shareChats: boolean;
  };
  highlighted?: boolean;
};

/**
 * Pricing rationale (INR, monthly):
 * - AI COGS roughly ₹40–150 (Beginner), ₹250–700 (Advanced), ₹800–2,500 (Pro)
 *   depending on Ask LOOP volume and Claude usage.
 * - Razorpay ~2% fee + GST handled by merchant of record.
 * - Target gross margin after AI + payment fees: ~70–85% at typical usage.
 * - Anchored under Dovetail / Enterpret enterprise pricing while covering
 *   India SMB willingness-to-pay for VOC tooling.
 */
export const PLANS: Record<PlanId, PlanDefinition> = {
  FREE: {
    id: "FREE",
    name: "Free",
    tagline: "Try LOOP with a small sample of feedback.",
    priceInr: 0,
    amountPaise: 0,
    currency: "INR",
    analysisModel: "google/gemini-2.5-flash",
    sentimentModel: "google/gemini-2.5-flash-lite",
    features: [
      "50 feedback items",
      "20 Ask LOOP questions / month",
      "1 workspace member",
      "Basic sentiment overview",
    ],
    limits: {
      members: 1,
      feedbackItems: 50,
      askLoopPerMonth: 20,
      reportsPerMonth: 0,
      integrations: false,
      shareChats: false,
    },
  },
  BEGINNER: {
    id: "BEGINNER",
    name: "Beginner",
    tagline: "For indie founders validating product-market fit.",
    priceInr: 1499,
    amountPaise: 149900,
    currency: "INR",
    analysisModel: "google/gemini-2.5-flash",
    sentimentModel: "google/gemini-2.5-flash-lite",
    features: [
      "1,000 feedback items",
      "150 Ask LOOP questions / month",
      "2 workspace members",
      "Weekly AI reports",
      "CSV upload + Ask LOOP charts",
    ],
    limits: {
      members: 2,
      feedbackItems: 1000,
      askLoopPerMonth: 150,
      reportsPerMonth: 4,
      integrations: false,
      shareChats: true,
    },
  },
  ADVANCED: {
    id: "ADVANCED",
    name: "Advanced",
    tagline: "For product teams closing the loop every sprint.",
    priceInr: 3999,
    amountPaise: 399900,
    currency: "INR",
    analysisModel: "google/gemini-2.5-pro",
    sentimentModel: "google/gemini-2.5-flash",
    features: [
      "10,000 feedback items",
      "600 Ask LOOP questions / month",
      "8 workspace members",
      "Google Play integration",
      "Deeper theme & hypothesis analysis",
      "Unlimited weekly reports",
    ],
    limits: {
      members: 8,
      feedbackItems: 10000,
      askLoopPerMonth: 600,
      reportsPerMonth: 30,
      integrations: true,
      shareChats: true,
    },
    highlighted: true,
  },
  PRO: {
    id: "PRO",
    name: "Pro",
    tagline: "For orgs that treat Voice of Customer as a system.",
    priceInr: 9999,
    amountPaise: 999900,
    currency: "INR",
    // Best qualitative analyst model on OpenRouter for nuanced VOC work.
    analysisModel: "anthropic/claude-sonnet-4",
    sentimentModel: "google/gemini-2.5-flash",
    features: [
      "50,000 feedback items",
      "2,000 Ask LOOP questions / month",
      "25 workspace members",
      "Claude Sonnet analyst model",
      "Priority-grade insight depth",
      "All Advanced features",
    ],
    limits: {
      members: 25,
      feedbackItems: 50000,
      askLoopPerMonth: 2000,
      reportsPerMonth: 100,
      integrations: true,
      shareChats: true,
    },
  },
};

export const PAID_PLANS = [PLANS.BEGINNER, PLANS.ADVANCED, PLANS.PRO] as const;

const PLAN_RANK: Record<PlanId, number> = {
  FREE: 0,
  BEGINNER: 1,
  ADVANCED: 2,
  PRO: 3,
};

/** Features gated by minimum plan. Dashboard + Settings stay open so users can upgrade. */
export type PlanFeature =
  | "dashboard"
  | "inbox"
  | "trends"
  | "ask"
  | "reports"
  | "settings"
  | "integrations"
  | "team"
  | "shareChats";

export const FEATURE_MIN_PLAN: Record<PlanFeature, PlanId> = {
  dashboard: "FREE",
  settings: "FREE",
  inbox: "BEGINNER",
  trends: "BEGINNER",
  ask: "BEGINNER",
  reports: "BEGINNER",
  team: "BEGINNER",
  shareChats: "BEGINNER",
  integrations: "ADVANCED",
};

export const FEATURE_LABELS: Record<PlanFeature, string> = {
  dashboard: "Dashboard",
  settings: "Settings",
  inbox: "Inbox",
  trends: "Trends",
  ask: "Ask LOOP",
  reports: "Reports",
  team: "Team invites",
  shareChats: "Share chats",
  integrations: "Integrations",
};

export function getPlan(plan: string | null | undefined): PlanDefinition {
  if (plan && plan in PLANS) return PLANS[plan as PlanId];
  return PLANS.FREE;
}

export function formatInr(amountInr: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amountInr);
}

/**
 * Temporary unlock: treat every workspace as Pro (features + limits).
 * Flip to false to restore plan gates. Payment checkout is separately disabled in billing UI/API.
 */
export const PLAN_GATES_OPEN = true;

export function isPaidPlan(plan: PlanId) {
  return plan !== "FREE";
}

/** Paid plan that has not expired. */
export function hasActivePaidPlan(plan: PlanId, planExpiresAt?: Date | string | null) {
  if (PLAN_GATES_OPEN) return true;
  if (!isPaidPlan(plan)) return false;
  if (!planExpiresAt) return true;
  const expires = typeof planExpiresAt === "string" ? new Date(planExpiresAt) : planExpiresAt;
  return expires.getTime() > Date.now();
}

/** Treat expired subscriptions as Free for access checks. */
export function effectivePlan(plan: PlanId, planExpiresAt?: Date | string | null): PlanId {
  if (PLAN_GATES_OPEN) return "PRO";
  return hasActivePaidPlan(plan, planExpiresAt) ? plan : "FREE";
}

export function canAccessFeature(
  plan: PlanId,
  planExpiresAt: Date | string | null | undefined,
  feature: PlanFeature,
) {
  if (PLAN_GATES_OPEN) return true;
  const current = effectivePlan(plan, planExpiresAt);
  const required = FEATURE_MIN_PLAN[feature];
  return PLAN_RANK[current] >= PLAN_RANK[required];
}

export function requiredPlanFor(feature: PlanFeature): PlanDefinition {
  return getPlan(FEATURE_MIN_PLAN[feature]);
}

export function planAllowsIntegrations(plan: PlanId, planExpiresAt?: Date | string | null) {
  return canAccessFeature(plan, planExpiresAt, "integrations");
}
