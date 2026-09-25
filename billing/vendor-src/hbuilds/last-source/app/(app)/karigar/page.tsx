import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import { db, karigarJobs, artisans } from "@/lib/db";
import { deleteJob } from "@/lib/actions/karigar";
import { addDays, fmtDate, gm, inr, statusTone, today } from "@/lib/utils";
import { Badge, Card, DeleteBtn, EmptyState, PageHeader } from "@/components/ui";
import { AddJobButton, EditJobButton } from "./job-form";

export const dynamic = "force-dynamic";

export default async function KarigarPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "" } = await searchParams;
  const arts = await db().select({ id: artisans.id, name: artisans.name }).from(artisans).orderBy(asc(artisans.name));
  const jobs = await db().select().from(karigarJobs)
    .where(status ? eq(karigarJobs.status, status) : undefined)
    .orderBy(desc(karigarJobs.id)).limit(300);

  const pendingWt = jobs.filter((j) => j.status !== "Completed").reduce((s, j) => s + (j.issuedWt ?? 0), 0);
  const t = today();

  return (
    <div className="space-y-4">
      <PageHeader title="Karigar Jobs" sub={`${gm(pendingWt)}g out with karigars`}
        actions={arts.length ? <AddJobButton artisansList={arts} /> : null} />

      {arts.length === 0 && (
        <Card>
          <EmptyState title="No karigars yet" desc="Add a karigar under Parties before issuing job work." />
          <div className="text-center">
            <Link href="/parties?tab=karigars" className="text-xs font-bold text-sky hover:underline">Go to Parties →</Link>
          </div>
        </Card>
      )}

      <div className="flex gap-1.5 flex-wrap">
        {["", "Pending", "In Progress", "Completed"].map((st) => (
          <a key={st || "all"} href={`/karigar${st ? `?status=${encodeURIComponent(st)}` : ""}`}
            className={`rounded-full px-3 py-1.5 text-[11px] font-bold border transition-colors ${status === st ? "border-gold text-gold bg-gold/10" : "border-edge text-mut hover:text-ink"}`}>
            {st || "All"}
          </a>
        ))}
      </div>

      <Card>
        {jobs.length === 0 ? (
          <EmptyState title="No jobs" desc="Issue metal to a karigar to track it here." />
        ) : (
          <div className="divide-y divide-edge/60 -mx-1">
            {jobs.map((j) => {
              const due = addDays(j.issueDate, j.durationDays ?? 15);
              const overdue = j.status !== "Completed" && due < t;
              return (
                <div key={j.id} className="flex items-start gap-3 px-1 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold">{j.artisanName}</div>
                    <div className="text-[11px] text-mut">
                      {j.metal} {j.purity} · {j.category} · issued {gm(j.issuedWt)}g
                      {(j.wastagePct ?? 0) > 0 ? ` · wastage ${j.wastagePct}%` : ""}
                      {(j.receivedWt ?? 0) > 0 ? ` · received ${gm(j.receivedWt)}g` : ""}
                    </div>
                    <div className="text-[11px] text-mut">
                      Issued {fmtDate(j.issueDate)} · Due <span className={overdue ? "text-red-400 font-bold" : ""}>{fmtDate(due)}</span>
                      {(j.labourCharges ?? 0) > 0 ? ` · Labour ₹${inr(j.labourCharges ?? 0)}` : ""}
                    </div>
                    <div className="mt-1 flex gap-1.5">
                      <Badge tone={statusTone(j.status)}>{j.status}</Badge>
                      {overdue && <Badge tone="red">Overdue</Badge>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <EditJobButton job={j} artisansList={arts} />
                    <DeleteBtn action={deleteJob.bind(null, j.id)} label={`job for ${j.artisanName}`} small />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
