
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter,
  DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Check, ChevronsUpDown, Search } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import { cn } from "@/lib/utils";
import { API_BASE_URL } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Link2, Pencil, Plus, Trash2, Hash, ChevronRight } from "lucide-react";

const API = `${API_BASE_URL}/no-series`;

// ─── Types ────────────────────────────────────────────────────────────────────

type NoSeries = {
  id: string;
  code: string;
  description: string | null;
  manual_nos: boolean;
  date_order: boolean;
};

type NoSeriesLine = {
  id: string;
  no_series_code: string;
  starting_date: string | null;
  starting_no: string;
  ending_no: string | null;
  last_no_used: string | null;
  last_date_used: string | null;
  increment_by: number;
  open: boolean;
  allow_gaps: boolean;
  sequence_no: number | null;
};

type NoSeriesRelationship = {
  id: number;
  series_code: string;
  related_series_code: string;
  related_description: string | null;
  starting_no: string | null;
  ending_no: string | null;
  last_no_used: string | null;
  increment_by: number | null;
  is_active: boolean;
  line_open: boolean | null;
};

type NoSeriesRelationshipOption = {
  code: string;
  description: string | null;
  is_active: boolean;
};

// ─── Next-number preview (computed from the active line) ──────────────────────
// Mirrors the backend logic: if last_no_used is null → starting_no is next,
// otherwise extract trailing digits, add increment_by, repad to same width.

function computeNextNo(line: NoSeriesLine): string {
  if (!line.last_no_used) return line.starting_no;
  const match = line.last_no_used.match(/(.*?)(\d+)$/);
  if (!match) return line.starting_no;
  const prefix = match[1];
  const width  = match[2].length;
  const next   = parseInt(match[2], 10) + line.increment_by;
  return prefix + String(next).padStart(width, "0");
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NoSeriesPage() {
  const [series,      setSeries]      = useState<NoSeries[]>([]);
  const [lines,       setLines]       = useState<NoSeriesLine[]>([]);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [linesLoading, setLinesLoading] = useState(false);

  // ── Header dialog state ──
  const [headerOpen,    setHeaderOpen]    = useState(false);
  const [editingHeader, setEditingHeader] = useState<NoSeries | null>(null);
  const [headerForm,    setHeaderForm]    = useState({
    code: "", description: "", manual_nos: false, date_order: false,
  });

  // Relationship dialog state
  const [relationshipOpen, setRelationshipOpen] = useState(false);
  const [relationships, setRelationships] = useState<NoSeriesRelationship[]>([]);
  const [relationshipOptions, setRelationshipOptions] = useState<NoSeriesRelationshipOption[]>([]);
  const [relationshipsLoading, setRelationshipsLoading] = useState(false);
  const [relatedSeriesCode, setRelatedSeriesCode] = useState("");

  // ── Line dialog state ──
  const [lineOpen,    setLineOpen]    = useState(false);
  const [editingLine, setEditingLine] = useState<NoSeriesLine | null>(null);
  const [lineForm,    setLineForm]    = useState({
    starting_date: "",
    starting_no:   "",
    ending_no:     "",
    increment_by:  1,
    allow_gaps:    false,
    sequence_no:   1,
  });

  // ── Loaders ───────────────────────────────────────────────────────────────

  const loadSeries = async () => {
    setLoading(true);
    try {
      const res  = await fetch(API);
      const json = await res.json();
      if (json.success) setSeries(json.data ?? []);
      else toast.error(json.message || "Failed to load series");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadLines = async (code: string) => {
    setLinesLoading(true);
    try {
      const res  = await fetch(`${API}/${code}/lines`);
      const json = await res.json();
      if (json.success) setLines(json.data ?? []);
      else setLines([]);
    } catch {
      setLines([]);
    } finally {
      setLinesLoading(false);
    }
  };

  const loadRelationships = async (code: string) => {
    setRelationshipsLoading(true);
    try {
      const [relationshipRes, optionRes] = await Promise.all([
        fetch(`${API}/${encodeURIComponent(code)}/relationships`),
        fetch(`${API}/${encodeURIComponent(code)}/relationship-options`),
      ]);
      const [relationshipJson, optionJson] = await Promise.all([
        relationshipRes.json().catch(() => ({})),
        optionRes.json().catch(() => ({})),
      ]);

      if (!relationshipRes.ok || !optionRes.ok) {
        const message =
          relationshipJson.message ||
          relationshipJson.error ||
          optionJson.message ||
          optionJson.error ||
          "Failed to load No. Series relationships";

        if (
          (relationshipRes.status === 404 || optionRes.status === 404) &&
          (!message || message === "API route not found")
        ) {
          throw new Error("No. Series Relationship API is not available. Restart the backend server.");
        }

        throw new Error(message);
      }

      if (relationshipJson.success) setRelationships(relationshipJson.data ?? []);
      else throw new Error(relationshipJson.message || "Failed to load relationships");

      if (optionJson.success) setRelationshipOptions(optionJson.data ?? []);
      else setRelationshipOptions([]);
    } catch (err: any) {
      toast.error(err.message || "Failed to load relationships");
      setRelationships([]);
      setRelationshipOptions([]);
    } finally {
      setRelationshipsLoading(false);
    }
  };

  useEffect(() => { loadSeries(); }, []);

  const selectSeries = (code: string) => {
    setSelectedCode(code);
    loadLines(code);
    loadRelationships(code);
  };

  // ── Header CRUD ───────────────────────────────────────────────────────────

  const openNewHeader = () => {
    setEditingHeader(null);
    setHeaderForm({ code: "", description: "", manual_nos: false, date_order: false });
    setHeaderOpen(true);
  };

  const openEditHeader = (s: NoSeries) => {
    setEditingHeader(s);
    setHeaderForm({
      code:        s.code,
      description: s.description ?? "",
      manual_nos:  s.manual_nos,
      date_order:  s.date_order,
    });
    setHeaderOpen(true);
  };

  const saveHeader = async () => {
    if (!headerForm.code.trim()) return toast.error("Code is required");

    const payload = {
      code:        headerForm.code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, ""),
      description: headerForm.description || null,
      manual_nos:  headerForm.manual_nos,
      date_order:  headerForm.date_order,
    };

    try {
      let res: Response;
      if (editingHeader) {
        res = await fetch(`${API}/${editingHeader.code}`, {
          method:  "PUT",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(payload),
        });
      } else {
        res = await fetch(API, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(payload),
        });
      }

      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Save failed");

      toast.success(editingHeader ? "Series updated" : "Series created");
      setHeaderOpen(false);
      await loadSeries();
      if (selectedCode && selectedCode === (editingHeader?.code ?? payload.code)) {
        loadLines(selectedCode);
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const deleteHeader = async (s: NoSeries) => {
    if (!confirm(`Delete number series "${s.code}"? This will also delete all its lines.`)) return;
    try {
      const res  = await fetch(`${API}/${s.code}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Delete failed");
      toast.success("Series deleted");
      if (selectedCode === s.code) { setSelectedCode(null); setLines([]); }
      loadSeries();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // ── Line CRUD ─────────────────────────────────────────────────────────────

  const openNewLine = () => {
    if (!selectedCode) return;
    setEditingLine(null);
    setLineForm({
      starting_date: new Date().toISOString().slice(0, 10),
      starting_no:   "",
      ending_no:     "",
      increment_by:  1,
      allow_gaps:    false,
      sequence_no:   (lines.length > 0 ? Math.max(...lines.map((l) => l.sequence_no ?? 0)) + 1 : 1),
    });
    setLineOpen(true);
  };

  const openEditLine = (l: NoSeriesLine) => {
    setEditingLine(l);
    setLineForm({
      starting_date: l.starting_date ?? "",
      starting_no:   l.starting_no,
      ending_no:     l.ending_no ?? "",
      increment_by:  l.increment_by,
      allow_gaps:    l.allow_gaps,
      sequence_no:   l.sequence_no ?? 1,
    });
    setLineOpen(true);
  };

  const saveLine = async () => {
    if (!selectedCode) return;
    if (!lineForm.starting_no.trim()) return toast.error("Starting No. is required");

    const payload = {
      starting_date: lineForm.starting_date || null,
      starting_no:   lineForm.starting_no.trim(),
      ending_no:     lineForm.ending_no.trim() || null,
      increment_by:  Number(lineForm.increment_by) || 1,
      allow_gaps:    lineForm.allow_gaps,
      open:          true,
      sequence_no:   Number(lineForm.sequence_no) || 1,
    };

    try {
      let res: Response;
      if (editingLine) {
        res = await fetch(`${API}/lines/${editingLine.id}`, {
          method:  "PUT",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${API}/${selectedCode}/lines`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(payload),
        });
      }

      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Save failed");

      toast.success(editingLine ? "Line updated" : "Line added");
      setLineOpen(false);
      loadLines(selectedCode);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const deleteLine = async (l: NoSeriesLine) => {
    if (!confirm("Delete this line?")) return;
    try {
      const res  = await fetch(`${API}/lines/${l.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Delete failed");
      toast.success("Line deleted");
      if (selectedCode) loadLines(selectedCode);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const openRelationships = () => {
    if (!selectedCode) {
      toast.error("Please select a No. Series first");
      return;
    }

    if (!selectedSeries) {
      toast.error("Please select a saved No. Series first");
      return;
    }

    setRelatedSeriesCode("");
    setRelationshipOpen(true);
    loadRelationships(selectedCode);
  };

  const addRelationship = async () => {
    if (!selectedCode || !relatedSeriesCode) return;

    try {
      const res = await fetch(`${API}/${encodeURIComponent(selectedCode)}/relationships`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ related_series_code: relatedSeriesCode }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to add relationship");

      toast.success("Relationship added");
      setRelatedSeriesCode("");
      loadRelationships(selectedCode);
    } catch (err: any) {
      toast.error(err.message || "Failed to add relationship");
    }
  };

  const deleteRelationship = async (relatedCode: string) => {
    if (!selectedCode) return;

    try {
      const res = await fetch(
        `${API}/${encodeURIComponent(selectedCode)}/relationships/${encodeURIComponent(relatedCode)}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to delete relationship");

      toast.success("Relationship deleted");
      loadRelationships(selectedCode);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete relationship");
    }
  };
  const selectedSeries = series.find((s) => s.code === selectedCode);

  // Active line = first open line sorted by sequence_no (mirrors backend /next logic)
  const activeLine = lines.find((l) => l.open) ?? lines[0] ?? null;
  const openLines = lines.filter((l) => l.open);
  const nextPreview = activeLine ? computeNextNo(activeLine) : null;

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div>
      <PageHeader
        title="No. Series"
        subtitle="Define document and master record numbering sequences"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={openRelationships}>
              <Link2 className="h-4 w-4 mr-1" /> Relationship
            </Button>
            <Button onClick={openNewHeader}>
              <Plus className="h-4 w-4 mr-1" /> New Series
            </Button>
          </div>
        }
      />

      <div className="p-6 flex gap-5">

        {/* ── Left: Series List ── */}
        <div className="flex-1 min-w-0">
          <div className="rounded-lg border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center">Manual Nos.</TableHead>
                  <TableHead className="text-center">Date Order</TableHead>
                  <TableHead>Next No. (preview)</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : series.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      No number series defined yet. Click <strong>New Series</strong> to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  series.map((s) => (
                    <SeriesRow
                      key={s.id}
                      s={s}
                      selected={selectedCode === s.code}
                      onSelect={() => selectSeries(s.code)}
                      onEdit={() => openEditHeader(s)}
                      onDelete={() => deleteHeader(s)}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* ── Right: Lines panel ── */}
        <div className="w-[440px] flex-shrink-0">
          <div className="rounded-lg border bg-card overflow-hidden flex flex-col" style={{ minHeight: 400 }}>

            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/40">
              <div>
                <p className="text-sm font-semibold">
                  {selectedSeries ? (
                    <span className="flex items-center gap-1.5">
                      <ChevronRight className="h-4 w-4 text-primary" />
                      {selectedSeries.code}
                      <span className="text-muted-foreground font-normal text-xs ml-1">— Lines</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground font-normal">Select a series to view lines</span>
                  )}
                </p>
                {nextPreview && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Next: <span className="font-mono text-primary font-semibold">{nextPreview}</span>
                  </p>
                )}
              </div>
              {selectedCode && (
                <Button size="sm" variant="outline" onClick={openNewLine}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Line
                </Button>
              )}
            </div>

            {/* Lines table */}
            <div className="flex-1 overflow-auto">
              {!selectedCode ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 py-16">
                  <Hash className="h-10 w-10 opacity-20" />
                  <p className="text-sm">Click a series on the left</p>
                </div>
              ) : linesLoading ? (
                <div className="text-center py-10 text-muted-foreground text-sm">Loading…</div>
              ) : lines.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  No lines yet — click <strong>Add Line</strong> to define the number range.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="text-xs">Seq.</TableHead>
                      <TableHead className="text-xs">Starting Date</TableHead>
                      <TableHead className="text-xs">Starting No.</TableHead>
                      <TableHead className="text-xs">Ending No.</TableHead>
                      <TableHead className="text-xs">Last Used</TableHead>
                      <TableHead className="text-xs text-center">Open</TableHead>
                      <TableHead className="w-16" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((l) => (
                      <TableRow key={l.id} className="text-sm">
                        <TableCell className="text-xs text-muted-foreground">{l.sequence_no ?? "—"}</TableCell>
                        <TableCell className="text-xs">{l.starting_date ?? "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{l.starting_no}</TableCell>
                        <TableCell className="font-mono text-xs">{l.ending_no ?? "—"}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{l.last_no_used ?? "—"}</TableCell>
                        <TableCell className="text-center">
                          {l.open
                            ? <Badge variant="secondary" className="text-xs">Yes</Badge>
                            : <span className="text-muted-foreground text-xs">—</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditLine(l)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteLine(l)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>

          {selectedCode && (
            <div className="mt-4 rounded-lg border bg-card overflow-hidden">
              <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-3">
                <div className="flex items-center gap-1">
                  <p className="text-sm font-semibold">Relationships</p>
                  <ChevronRight className="h-4 w-4 rotate-90 text-muted-foreground" />
                </div>
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={openRelationships}>
                  Manage
                </Button>
              </div>

              <div className="max-h-64 overflow-auto p-3">
                <div className="rounded-md border bg-muted/20 overflow-hidden">
                  {relationshipsLoading ? (
                    <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                      Loading relationships...
                    </div>
                  ) : relationships.length === 0 ? (
                    <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                      There is nothing to show in this view.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40">
                            <TableHead className="text-xs">Series Code</TableHead>
                            <TableHead className="text-xs">Series Description</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {relationships.map((relationship) => (
                            <TableRow key={relationship.id}>
                              <TableCell className="font-mono text-xs font-semibold text-primary">
                                {relationship.related_series_code}
                              </TableCell>
                              <TableCell className="text-xs">
                                {relationship.related_description || "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Header Dialog ── */}
      {/* Relationships Dialog */}
      <Dialog open={relationshipOpen} onOpenChange={setRelationshipOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>No. Series Relationships</DialogTitle>
            <DialogDescription>
              Manage alternate No. Series codes that are related to the selected source series.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md border bg-muted/30 p-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <F label="Series Code / Current Series Code">
                  <Input value={selectedSeries?.code ?? ""} readOnly />
                </F>
                <F label="Description">
                  <Input value={selectedSeries?.description ?? ""} readOnly />
                </F>
              </div>
            </div>

            <div className="rounded-md border">
              <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">Relationship Lines</p>
                  <p className="text-xs text-muted-foreground">
                    Alternate No. Series allowed for the selected source series.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Related Series Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Starting No.</TableHead>
                      <TableHead>Ending No.</TableHead>
                      <TableHead>Last No. Used</TableHead>
                      <TableHead>Increment By</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead className="w-16" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {relationshipsLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                          Loading relationships...
                        </TableCell>
                      </TableRow>
                    ) : relationships.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                          No related No. Series yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      relationships.map((relationship) => (
                        <TableRow key={relationship.id}>
                          <TableCell className="font-mono font-semibold text-primary">
                            {relationship.related_series_code}
                          </TableCell>
                          <TableCell>{relationship.related_description ?? "-"}</TableCell>
                          <TableCell className="font-mono text-xs">{relationship.starting_no ?? "-"}</TableCell>
                          <TableCell className="font-mono text-xs">{relationship.ending_no ?? "-"}</TableCell>
                          <TableCell className="font-mono text-xs">{relationship.last_no_used ?? "-"}</TableCell>
                          <TableCell>{relationship.increment_by ?? "-"}</TableCell>
                          <TableCell>
                            {relationship.is_active && relationship.line_open !== false ? (
                              <Badge variant="secondary" className="text-xs">Yes</Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => deleteRelationship(relationship.related_series_code)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="rounded-md border bg-card p-4">
              <p className="mb-3 text-sm font-semibold">Add Relationship</p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="w-full sm:max-w-xl">
  <RelationshipNoSeriesDropdown
    value={relatedSeriesCode}
    options={relationshipOptions}
    onChange={setRelatedSeriesCode}
  />
</div>
                <Button
                  onClick={addRelationship}
                  disabled={!relatedSeriesCode || relationshipsLoading}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
              {relationshipOptions.length === 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  No available No. Series remain for this relationship.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRelationshipOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={headerOpen} onOpenChange={setHeaderOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingHeader ? "Edit No. Series" : "New No. Series"}</DialogTitle>
            <DialogDescription>
              Define the No. Series code and behavior. Number ranges are managed in the lines section.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div className="grid grid-cols-2 gap-3">
              <F label="Code *">
                <Input
                  value={headerForm.code}
                  disabled={!!editingHeader}
                  placeholder="e.g. SALES-ORDER"
                  onChange={(e) =>
                    setHeaderForm({ ...headerForm, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") })
                  }
                />
              </F>
              <F label="Description">
                <Input
                  value={headerForm.description}
                  placeholder="Human-readable label"
                  onChange={(e) => setHeaderForm({ ...headerForm, description: e.target.value })}
                />
              </F>
            </div>

            <Separator />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Behaviour</p>

            <ToggleRow
              label="Manual Nos."
              description="Allow users to type document numbers manually instead of auto-assigning from the line range."
              checked={headerForm.manual_nos}
              onCheckedChange={(v) => setHeaderForm({ ...headerForm, manual_nos: v })}
            />
            <ToggleRow
              label="Date Order"
              description="Enforce that numbers are consumed in chronological date order."
              checked={headerForm.date_order}
              onCheckedChange={(v) => setHeaderForm({ ...headerForm, date_order: v })}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setHeaderOpen(false)}>Cancel</Button>
            <Button onClick={saveHeader}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Line Dialog ── */}
      <Dialog open={lineOpen} onOpenChange={setLineOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingLine ? "Edit Line" : "Add Line"} — {selectedCode}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div className="grid grid-cols-2 gap-3">
              <F label="Starting No. *">
                <Input
                  value={lineForm.starting_no}
                  placeholder="e.g. SO-00001"
                  onChange={(e) => setLineForm({ ...lineForm, starting_no: e.target.value })}
                />
              </F>
              <F label="Ending No.">
                <Input
                  value={lineForm.ending_no}
                  placeholder="e.g. SO-99999"
                  onChange={(e) => setLineForm({ ...lineForm, ending_no: e.target.value })}
                />
              </F>
              <F label="Starting Date">
                <Input
                  type="date"
                  value={lineForm.starting_date}
                  onChange={(e) => setLineForm({ ...lineForm, starting_date: e.target.value })}
                />
              </F>
              <F label="Increment By">
                <Input
                  type="number"
                  min={1}
                  value={lineForm.increment_by}
                  onChange={(e) => setLineForm({ ...lineForm, increment_by: Number(e.target.value) })}
                />
              </F>
              <F label="Sequence No.">
                <Input
                  type="number"
                  min={1}
                  value={lineForm.sequence_no}
                  onChange={(e) => setLineForm({ ...lineForm, sequence_no: Number(e.target.value) })}
                />
              </F>
            </div>

            <Separator />

            <ToggleRow
              label="Allow Gaps"
              description="Allow gaps in the number sequence (e.g. when numbers are reserved but unused)."
              checked={lineForm.allow_gaps}
              onCheckedChange={(v) => setLineForm({ ...lineForm, allow_gaps: v })}
            />

            {/* Preview of next number from this line */}
            <div className="rounded-md border bg-muted/40 px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Starting number preview</span>
              <span className="font-mono font-semibold text-primary text-sm">
                {lineForm.starting_no || "—"}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setLineOpen(false)}>Cancel</Button>
            <Button onClick={saveLine}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Series row (memoised to avoid unnecessary re-renders) ────────────────────

function SeriesRow({
  s, selected, onSelect, onEdit, onDelete,
}: {
  s: NoSeries;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  // We can't compute the next number without loading lines, so show a dash.
  // The real next-number preview appears in the lines panel once selected.
  return (
    <TableRow
      className={`cursor-pointer transition-colors ${
        selected ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-muted/40"
      }`}
      onClick={onSelect}
    >
      <TableCell className="font-mono font-semibold text-primary">
        <span className="flex items-center gap-1.5">
          <Hash className="h-3.5 w-3.5 text-muted-foreground" />
          {s.code}
        </span>
      </TableCell>
      <TableCell className="text-sm">{s.description ?? <span className="text-muted-foreground">—</span>}</TableCell>
      <TableCell className="text-center">
        {s.manual_nos
          ? <Badge variant="secondary" className="text-xs">Yes</Badge>
          : <span className="text-muted-foreground text-xs">—</span>}
      </TableCell>
      <TableCell className="text-center">
        {s.date_order
          ? <Badge variant="secondary" className="text-xs">Yes</Badge>
          : <span className="text-muted-foreground text-xs">—</span>}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {selected ? "" : "Select to view"}
      </TableCell>
      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
        <Button size="icon" variant="ghost" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

// ─── Small helpers ─────────────────────────────────────────────────────────────

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs mb-1 block">{label}</Label>
      {children}
    </div>
  );
}

function ToggleRow({
  label, description, checked, onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
function RelationshipNoSeriesDropdown({
  value,
  options,
  onChange,
}: {
  value: string;
  options: NoSeriesRelationshipOption[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const selected = options.find((o) => o.code === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="h-10 w-full justify-between bg-white font-normal"
        >
          {selected ? (
            <span>
              {selected.code}
              {selected.description ? ` - ${selected.description}` : ""}
            </span>
          ) : (
            <span className="text-muted-foreground">Select No. Series</span>
          )}

          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-60" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
  align="start"
  side="bottom"
  sideOffset={4}
  className="z-[9999] w-[640px] p-0 rounded-md border bg-white shadow-xl"
>
        <Command>
          <div className="border-b px-3 py-3">
            <div className="flex items-center gap-2 rounded-md border px-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <CommandInput
                placeholder="Search by code or description..."
                className="h-10 border-0 focus:ring-0 focus-visible:ring-0"
              />
            </div>
          </div>

          <div className="max-h-[340px] overflow-y-auto overscroll-contain" onWheel={(e) => e.stopPropagation()}>
  <CommandList className="max-h-none overflow-visible">
            <CommandEmpty>No No. Series found.</CommandEmpty>

            <CommandGroup>
              <div className="sticky top-0 z-10 grid grid-cols-[240px_1fr] border-b bg-muted/60 px-4 py-3 text-sm font-semibold text-muted-foreground">
                <div>Code ↑</div>
                <div>Description</div>
              </div>

              {options.map((option) => (
                <CommandItem
                  key={option.code}
                  value={`${option.code} ${option.description ?? ""}`}
                  onSelect={() => {
                    onChange(option.code);
                    setOpen(false);
                  }}
                  className="grid grid-cols-[240px_1fr] cursor-pointer rounded-none border-b px-4 py-3 hover:bg-blue-50 aria-selected:bg-blue-100"
                >
                  <div className="flex items-center gap-2 font-semibold text-primary">
                    <Check
                      className={cn(
                        "h-4 w-4",
                        value === option.code ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option.code}
                  </div>

                  <div className="text-foreground">
                    {option.description ?? "-"}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          </div>

          <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
            <span>
              1 - {options.length} of {options.length}
            </span>
            <span>Page 1</span>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
