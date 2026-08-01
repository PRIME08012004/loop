import { NextResponse } from "next/server";
import { requireOrgOwner } from "@/lib/dashboard-session";
import prisma from "@/lib/db";

export async function POST(request: Request) {
  const { organizationId } = await requireOrgOwner();
  const body = (await request.json()) as { packageName?: string };

  const packageName = typeof body.packageName === "string" ? body.packageName.trim() : "";
  if (!packageName || !/^[a-zA-Z][\w.]*(\.[a-zA-Z][\w.]*)+$/.test(packageName)) {
    return NextResponse.json({ error: "Enter a valid package name (e.g. com.example.app)." }, { status: 400 });
  }

  const integration = await prisma.appIntegration.findUnique({
    where: { organizationId_provider: { organizationId, provider: "GOOGLE_PLAY" } },
  });

  if (!integration?.refreshToken) {
    return NextResponse.json({ error: "Connect Google Play before setting a package name." }, { status: 400 });
  }

  await prisma.appIntegration.update({
    where: { id: integration.id },
    data: { packageName, status: "ACTIVE", lastPollError: null },
  });

  return NextResponse.json({ ok: true, packageName });
}

export async function DELETE() {
  const { organizationId } = await requireOrgOwner();

  await prisma.appIntegration.updateMany({
    where: { organizationId, provider: "GOOGLE_PLAY" },
    data: {
      status: "DISCONNECTED",
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      packageName: null,
      lastPollError: null,
    },
  });

  return NextResponse.json({ ok: true });
}
