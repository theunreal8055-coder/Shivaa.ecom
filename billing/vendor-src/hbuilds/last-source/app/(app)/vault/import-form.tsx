"use client";

import { useActionState, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { importBackup } from "@/lib/actions/vault";
import { idle } from "@/lib/actions/helpers";
import { Msg, SubmitBtn } from "@/components/ui";

export function ImportForm() {
  const [state, action] = useActionState(importBackup, idle);
  const [fileName, setFileName] = useState("");
  const jsonRef = useRef<HTMLInputElement>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const text = await file.text();
    if (jsonRef.current) jsonRef.current.value = text;
  };

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="json" ref={jsonRef} />
      <label className="flex items-center gap-3 rounded-xl border border-dashed border-edge bg-panel2 px-4 py-5 cursor-pointer hover:border-gold/50 transition-colors">
        <Upload size={18} className="text-gold shrink-0" />
        <div className="min-w-0">
          <div className="text-sm font-bold">{fileName || "Choose backup file (.json)"}</div>
          <div className="text-[11px] text-mut">Works with backups from the old Shivaa app and from this one.</div>
        </div>
        <input type="file" accept="application/json,.json" onChange={onFile} className="hidden" />
      </label>
      <Msg state={state} />
      <SubmitBtn label="Import Backup" pendingLabel="Importing…" full variant="ghost" />
      <p className="text-[11px] text-mut">Import adds records to the existing data — it does not erase anything.</p>
    </form>
  );
}
