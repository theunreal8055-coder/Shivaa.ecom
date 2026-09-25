"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { saveJob } from "@/lib/actions/karigar";
import { idle } from "@/lib/actions/helpers";
import { CATEGORIES, PURITIES, today } from "@/lib/utils";
import { Button, EditIconBtn, Field, Input, Modal, Msg, Select, SubmitBtn, Textarea } from "@/components/ui";
import type { karigarJobs } from "@/lib/db/schema";

type Job = typeof karigarJobs.$inferSelect;
type Artisan = { id: number; name: string };

function JobFields({ job, artisansList }: { job?: Job; artisansList: Artisan[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {job && <input type="hidden" name="id" value={job.id} />}
      <Field label="Karigar" className="col-span-2 sm:col-span-3">
        <Select name="artisanId" defaultValue={job?.artisanId ?? ""} required>
          <option value="">— Select karigar —</option>
          {artisansList.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Select>
      </Field>
      <Field label="Metal">
        <Select name="metal" defaultValue={job?.metal ?? "Gold"}><option>Gold</option><option>Silver</option></Select>
      </Field>
      <Field label="Category">
        <Select name="category" defaultValue={job?.category ?? "Rings"}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select>
      </Field>
      <Field label="Purity">
        <Select name="purity" defaultValue={job?.purity ?? "22K (916)"}>{PURITIES.map((p) => <option key={p}>{p}</option>)}</Select>
      </Field>
      <Field label="Issue date">
        <Input name="issueDate" type="date" defaultValue={job?.issueDate ?? today()} />
      </Field>
      <Field label="Duration (days)">
        <Input name="durationDays" type="number" min="1" defaultValue={job?.durationDays || 15} />
      </Field>
      <Field label="Labour (₹)">
        <Input name="labourCharges" type="number" step="0.01" min="0" defaultValue={job?.labourCharges || ""} />
      </Field>
      <Field label="Issued wt (g)">
        <Input name="issuedWt" type="number" step="0.001" min="0" defaultValue={job?.issuedWt || ""} required />
      </Field>
      <Field label="Less wt (g)">
        <Input name="lessWt" type="number" step="0.001" min="0" defaultValue={job?.lessWt || ""} />
      </Field>
      <Field label="Wastage %">
        <Input name="wastagePct" type="number" step="0.1" min="0" defaultValue={job?.wastagePct || ""} />
      </Field>
      <Field label="Received wt (g)">
        <Input name="receivedWt" type="number" step="0.001" min="0" defaultValue={job?.receivedWt || ""} />
      </Field>
      <Field label="Status" className="col-span-2 sm:col-span-2">
        <Select name="status" defaultValue={job?.status ?? "Pending"}>
          <option>Pending</option><option>In Progress</option><option>Completed</option>
        </Select>
      </Field>
      <Field label="Notes" className="col-span-2 sm:col-span-3">
        <Textarea name="notes" rows={2} defaultValue={job?.notes ?? ""} />
      </Field>
    </div>
  );
}

export function AddJobButton({ artisansList }: { artisansList: Artisan[] }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(saveJob, idle);
  useEffect(() => { if (state.ok) setOpen(false); }, [state]);
  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus size={16} /> Issue Job</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Issue Job Work" wide>
        <form action={action} className="space-y-4">
          <JobFields artisansList={artisansList} />
          <Msg state={state} />
          <SubmitBtn label="Save Job" pendingLabel="Saving…" full />
        </form>
      </Modal>
    </>
  );
}

export function EditJobButton({ job, artisansList }: { job: Job; artisansList: Artisan[] }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(saveJob, idle);
  useEffect(() => { if (state.ok) setOpen(false); }, [state]);
  return (
    <>
      <EditIconBtn onClick={() => setOpen(true)} />
      <Modal open={open} onClose={() => setOpen(false)} title={`Job · ${job.artisanName}`} wide>
        <form action={action} className="space-y-4">
          <JobFields job={job} artisansList={artisansList} />
          <Msg state={state} />
          <SubmitBtn label="Update Job" pendingLabel="Saving…" full />
        </form>
      </Modal>
    </>
  );
}
