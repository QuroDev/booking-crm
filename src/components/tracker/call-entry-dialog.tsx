"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DateTime } from "luxon";
import { AlertTriangle, Loader2, PhoneOutgoing } from "lucide-react";
import { toast } from "sonner";
import {
  addCallEntry,
  findPreviousContacts,
  updateCallEntry,
  type CallEntryInput,
  type PreviousContactMatch,
} from "@/actions/call-log";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CALL_OUTCOMES, callOutcomeLabel } from "@/lib/constants";
import type { CallLogEntry } from "@/types/database";

type FormState = {
  contactName: string;
  businessName: string;
  phone: string;
  email: string;
  callDate: string;
  outcome: CallLogEntry["outcome"];
  notes: string;
};

function emptyForm(): FormState {
  return {
    contactName: "",
    businessName: "",
    phone: "",
    email: "",
    callDate: DateTime.now().toISODate()!,
    outcome: "no_answer",
    notes: "",
  };
}

function entryToForm(entry: CallLogEntry): FormState {
  return {
    contactName: entry.contact_name,
    businessName: entry.business_name ?? "",
    phone: entry.phone,
    email: entry.email ?? "",
    callDate: entry.call_date,
    outcome: entry.outcome,
    notes: entry.notes ?? "",
  };
}

export function CallEntryDialog({
  entry,
  trigger,
}: {
  /** When present, the dialog edits this entry instead of creating one. */
  entry?: CallLogEntry;
  trigger: React.ReactElement;
}) {
  const router = useRouter();
  const isEdit = Boolean(entry);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(
    entry ? entryToForm(entry) : emptyForm()
  );
  const [matches, setMatches] = useState<PreviousContactMatch[]>([]);
  const [pending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Duplicate-call guard: as identifying fields change, look up who was
  // already called (shared log + bookings).
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const found = await findPreviousContacts({
        phone: form.phone,
        name: form.contactName,
        business: form.businessName,
        excludeEntryId: entry?.id,
      });
      setMatches(found);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [open, form.phone, form.contactName, form.businessName, entry?.id]);

  function submit() {
    startTransition(async () => {
      const input: CallEntryInput = form;
      const result = isEdit
        ? await updateCallEntry(entry!.id, input)
        : await addCallEntry(input);
      if (!result.ok) {
        toast.error(result.error ?? "Something went wrong");
        return;
      }
      toast.success(isEdit ? "Call entry updated" : "Call logged");
      setOpen(false);
      if (!isEdit) setForm(emptyForm());
      setMatches([]);
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setForm(entry ? entryToForm(entry) : emptyForm());
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit call entry" : "Log a call"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the details of this call."
              : "Record who you called so the team doesn't call them again."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cl-name">Contact name *</Label>
              <Input
                id="cl-name"
                value={form.contactName}
                onChange={(e) => set("contactName", e.target.value)}
                placeholder="Jane Smith"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cl-business">Business</Label>
              <Input
                id="cl-business"
                value={form.businessName}
                onChange={(e) => set("businessName", e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cl-phone">Phone *</Label>
              <Input
                id="cl-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+1 555 0100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cl-email">Email</Label>
              <Input
                id="cl-email"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          {matches.length > 0 ? (
            <div className="space-y-2 rounded-lg border border-warning/40 bg-warning/10 p-3">
              <p className="flex items-center gap-2 text-xs font-semibold text-warning">
                <AlertTriangle className="size-3.5" /> Possible repeat — already
                contacted:
              </p>
              {matches.map((match, i) => (
                <p key={i} className="text-xs text-warning/90">
                  {match.name}
                  {match.business ? ` (${match.business})` : ""} · {match.phone}{" "}
                  · {match.when}
                  {match.outcome ? ` · ${callOutcomeLabel(match.outcome)}` : ""}
                  {match.by ? ` · by ${match.by}` : ""}
                  {match.source === "booking" ? " · booked meeting" : ""}
                </p>
              ))}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cl-date">Call date *</Label>
              <Input
                id="cl-date"
                type="date"
                value={form.callDate}
                onChange={(e) => set("callDate", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Outcome *</Label>
              <Select
                items={CALL_OUTCOMES.map((o) => ({
                  label: o.label,
                  value: o.value,
                }))}
                value={form.outcome}
                onValueChange={(v) => set("outcome", v as FormState["outcome"])}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CALL_OUTCOMES.map((outcome) => (
                    <SelectItem key={outcome.value} value={outcome.value}>
                      {outcome.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cl-notes">Notes</Label>
            <Textarea
              id="cl-notes"
              rows={3}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="What was said, when to follow up…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <PhoneOutgoing className="size-4" />
            )}
            {isEdit ? "Save changes" : "Log call"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
