import prisma from "@/lib/db";
import type { OrgRole } from "@/app/generated/prisma/client";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "workspace";
}

async function uniqueSlug(base: string) {
  let slug = slugify(base);
  let attempt = 0;
  while (await prisma.organization.findUnique({ where: { slug } })) {
    attempt += 1;
    slug = `${slugify(base)}-${attempt}`;
  }
  return slug;
}

export async function ensureUserOrganization(userId: string, userName?: string | null, email?: string | null) {
  if (email) {
    const pendingInvites = await prisma.orgInvite.findMany({ where: { email: email.toLowerCase() } });
    for (const invite of pendingInvites) {
      await prisma.orgMember.upsert({
        where: { organizationId_userId: { organizationId: invite.organizationId, userId } },
        create: { organizationId: invite.organizationId, userId, role: invite.role },
        update: { role: invite.role },
      });
      await prisma.orgInvite.delete({ where: { id: invite.id } });
    }
  }

  const existing = await prisma.orgMember.findFirst({
    where: { userId },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });

  if (existing) {
    return {
      organizationId: existing.organizationId,
      organizationName: existing.organization.name,
      orgRole: existing.role as OrgRole,
    };
  }

  const label = userName?.trim() || email?.split("@")[0] || "My workspace";
  const organization = await prisma.organization.create({
    data: {
      name: `${label}'s workspace`,
      slug: await uniqueSlug(label),
      members: {
        create: { userId, role: "OWNER" },
      },
    },
  });

  return {
    organizationId: organization.id,
    organizationName: organization.name,
    orgRole: "OWNER" as OrgRole,
  };
}

export async function getOrgMembership(userId: string, organizationId: string) {
  return prisma.orgMember.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
  });
}
