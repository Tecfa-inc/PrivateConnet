import { requireStaff } from "@/lib/auth/staff-guard";
import { db } from "@/lib/db";
import { AdminShell } from "@/components/admin/AdminShell";
import { INTERESTS } from "@/features/admin/members/schemas";
import { CreateMemberForm } from "./CreateMemberForm";

export const dynamic = "force-dynamic";

/** Create member (ONB-01 to ONB-05, US-01). Admin and Super Admin only. */
export default async function CreateMemberPage() {
  const staff = await requireStaff("members.create");
  const cities = await db.city.findMany({
    where: { active: true, country: { active: true } },
    orderBy: [{ name: "asc" }, { area: "asc" }],
    select: { id: true, name: true, area: true },
  });
  return (
    <AdminShell staff={staff} active="/admin/members/new">
      <h1 className="text-[28px] font-bold tracking-tight">Create member</h1>
      <CreateMemberForm
        cities={cities.map((c) => ({ id: c.id, label: c.area ? `${c.name} – ${c.area}` : c.name }))}
        interests={INTERESTS}
      />
    </AdminShell>
  );
}
