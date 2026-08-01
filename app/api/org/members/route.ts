import { NextResponse } from "next/server";
import { requireOrgOwner } from "@/lib/dashboard-session";
import prisma from "@/lib/db";
import type { OrgRole } from "@/lib/permissions";

const ROLES = new Set<OrgRole>(["OWNER", "ANALYST", "VIEWER"]);

export async function GET() {
  const { organizationId } = await requireOrgOwner();

  const [members, invites] = await Promise.all([
    prisma.orgMember.findMany({
      where: { organizationId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.orgInvite.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({
    members: members.map((member) => ({
      id: member.id,
      userId: member.userId,
      name: member.user.name,
      email: member.user.email,
      role: member.role,
    })),
    invites,
  });
}

export async function POST(request: Request) {
  const { organizationId, userId } = await requireOrgOwner();
  const body = (await request.json()) as { email?: string; role?: string };

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const role = (body.role ?? "ANALYST") as OrgRole;

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
  }
  if (!ROLES.has(role) || role === "OWNER") {
    return NextResponse.json({ error: "Invalid role. Choose Analyst or Viewer." }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    const existingMember = await prisma.orgMember.findUnique({
      where: { organizationId_userId: { organizationId, userId: existingUser.id } },
    });
    if (existingMember) {
      return NextResponse.json({ error: "This user is already a member." }, { status: 400 });
    }

    await prisma.orgMember.create({
      data: { organizationId, userId: existingUser.id, role },
    });

    return NextResponse.json({ ok: true, added: true, email });
  }

  await prisma.orgInvite.upsert({
    where: { organizationId_email: { organizationId, email } },
    create: { organizationId, email, role, invitedById: userId },
    update: { role, invitedById: userId },
  });

  return NextResponse.json({ ok: true, invited: true, email });
}

export async function PATCH(request: Request) {
  const { organizationId } = await requireOrgOwner();
  const body = (await request.json()) as { memberId?: string; role?: string };

  const memberId = body.memberId;
  const role = body.role as OrgRole;

  if (!memberId || !role || !ROLES.has(role)) {
    return NextResponse.json({ error: "Invalid member or role." }, { status: 400 });
  }

  const member = await prisma.orgMember.findFirst({ where: { id: memberId, organizationId } });
  if (!member) return NextResponse.json({ error: "Member not found." }, { status: 404 });
  if (member.role === "OWNER" && role !== "OWNER") {
    const ownerCount = await prisma.orgMember.count({ where: { organizationId, role: "OWNER" } });
    if (ownerCount <= 1) {
      return NextResponse.json({ error: "Cannot remove the only owner." }, { status: 400 });
    }
  }

  await prisma.orgMember.update({ where: { id: memberId }, data: { role } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const { organizationId } = await requireOrgOwner();
  const url = new URL(request.url);
  const memberId = url.searchParams.get("memberId");

  if (!memberId) return NextResponse.json({ error: "memberId is required." }, { status: 400 });

  const member = await prisma.orgMember.findFirst({ where: { id: memberId, organizationId } });
  if (!member) return NextResponse.json({ error: "Member not found." }, { status: 404 });
  if (member.role === "OWNER") {
    const ownerCount = await prisma.orgMember.count({ where: { organizationId, role: "OWNER" } });
    if (ownerCount <= 1) {
      return NextResponse.json({ error: "Cannot remove the only owner." }, { status: 400 });
    }
  }

  await prisma.orgMember.delete({ where: { id: memberId } });
  return NextResponse.json({ ok: true });
}
