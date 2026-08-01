import { cache } from "react";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { ensureUserOrganization } from "@/lib/org";
import type { OrgRole } from "@/lib/permissions";

const ORG_COOKIE = "loop-org-id";

async function resolveOrgSession(userId: string, name?: string | null, email?: string | null) {
  const orgContext = await ensureUserOrganization(userId, name, email);
  const cookieStore = await cookies();
  const cookieOrgId = cookieStore.get(ORG_COOKIE)?.value;

  let organizationId = orgContext.organizationId;
  let orgRole = orgContext.orgRole;
  let organizationName = orgContext.organizationName;

  if (cookieOrgId && cookieOrgId !== organizationId) {
    const membership = await prisma.orgMember.findUnique({
      where: {
        organizationId_userId: { organizationId: cookieOrgId, userId },
      },
      include: { organization: true },
    });
    if (membership) {
      organizationId = membership.organizationId;
      orgRole = membership.role as OrgRole;
      organizationName = membership.organization.name;
    }
  }

  return {
    userId,
    userName: name ?? email ?? "there",
    userEmail: email,
    organizationId,
    organizationName,
    orgRole,
    userRole: orgRole,
  };
}

/** For pages — redirects when unauthenticated. */
export const requireDashboardSession = cache(async () => {
  const { redirect } = await import("next/navigation");
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/login?callbackUrl=/dashboard");
    throw new Error("Unauthenticated");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });
  if (!user) {
    redirect("/login?callbackUrl=/dashboard");
    throw new Error("Unauthenticated");
  }

  return resolveOrgSession(userId, user.name, user.email);
});

/** For API routes — returns JSON 401 instead of redirecting. */
export async function requireApiSession() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Please sign in." }, { status: 401 }) };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true },
  });
  if (!user) {
    return { error: NextResponse.json({ error: "Please sign in." }, { status: 401 }) };
  }

  const ctx = await resolveOrgSession(session.user.id, user.name, user.email);
  return { ctx };
}

export async function requireOrgOwner() {
  const { redirect } = await import("next/navigation");
  const ctx = await requireDashboardSession();
  if (ctx.orgRole !== "OWNER") redirect("/dashboard");
  return ctx;
}

export async function requireOrgMember() {
  return requireDashboardSession();
}

export { ORG_COOKIE };
