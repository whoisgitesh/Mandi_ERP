import { useEffect, useState } from "react";

import { api } from "@/lib/api";

import { PageHeader } from "@/components/PageHeader";
import { MasterNoSeriesSelect } from "@/components/MasterNoSeriesSelect";
import { ListPageSkeleton } from "@/components/skeletons/ErpSkeletons";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import { Switch } from "@/components/ui/switch";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { toast } from "sonner";

import {
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

type Row = Record<string, any>;

type TdsOption = {
  code: string;
  description?: string | null;
  is_active?: boolean | null;
};

const NONE_VALUE = "__none__";

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

const formatPanNo = (value: any) =>
  String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 10);

const empty: Row = {
  vendor_no: "",

  name: "",

  search_name: "",

  blocked: "",

  privacy_blocked: false,

  email: "",

  city: "",

  balance_lcy: 0,

  balance_due_lcy: 0,

  payments_lcy: 0,

  balance_lcy_as_customer: 0,

  last_date_modified: null,

  document_sending_profile: "",

  ic_partner_code: "",

  purchaser_code: "",

  location_code: "",

  payment_terms_id: "",

  payment_terms_code: "",

  payment_method_code: "",

  responsibility_center: "",

  disable_search_by_name: false,

  company_size_code: "",

  state_code: "",

  transporter: false,

  sustainability_certificate_no: "",

  sustainability_certificate_name: "",

  carbon_pricing_paid: false,

  address: "",

  address_2: "",

  country_region_code: "",

  post_code: "",

  phone_no: "",

  mobile_phone_no: "",

  contract_person: "",

  home_page: "",

  our_account_no: "",

  language_code: "",

  format_region: "",

  primary_contact_code: "",

  contact: "",

  vat_registration_no: "",

  prices_including_vat: false,

  bank_name: "",

  bank_account_no: "",

  ifsc_code: "",

  msme: false,

  msme_no: "",

  shipment_method_code: "",

  base_calendar_code: "",

  customized_calendar: "",

  receive_e_document_to: "",

  e_document_service_participation: 0,

  assessee_code: "",
  tds_applicable: false,
  tds_section_code: "",
  tds_assessee_code: "",
  lower_deduction_certificate_no: "",
  concessional_code: "",

  pan_no: "",

  pan_status: "",

  pan_reference_no: "",

  govt_undertaking: false,

  gst_registration_no: "",

  gst_vendor_type: "",

  associated_enterprises: false,

  aggregate_turnover: "",

  arn_no: "",

  subcontractor: false,

  vendor_location: "",

  commissioners_permission_no: "",

  dammi: 0,

  mandi_labour: 0,

  loading_stiching: 0,

  commission: 0,

  dalali: 0,

  market_fees: 0,

  market_pct: 0,

  hrdf: 0,

  hrdf_pct: 0,

  cancer_fund: 0,

  mandi_dhara_fof_payment: "",

  bardana_weight: 0,

  per_pack_qty: 0,

  auction: 0,
};

const NUMERIC = new Set([
  "balance_lcy",
  "balance_due_lcy",
  "payments_lcy",
  "balance_lcy_as_customer",
  "e_document_service_participation",
  "dammi",
  "mandi_labour",
  "loading_stiching",
  "commission",
  "dalali",
  "market_fees",
  "market_pct",
  "hrdf",
  "hrdf_pct",
  "cancer_fund",
  "bardana_weight",
  "per_pack_qty",
  "auction",
]);

export default function Vendors() {

  const [rows, setRows] =
    useState<Row[]>([]);

  const [open, setOpen] =
    useState(false);

  const [editing, setEditing] =
    useState<Row | null>(null);

  const [form, setForm] =
    useState<Row>({ ...empty });

  const [loading, setLoading] =
    useState(true);

  const [noSeriesLineId, setNoSeriesLineId] =
    useState("");

  const [tdsSections, setTdsSections] =
    useState<TdsOption[]>([]);

  const [tdsAssessees, setTdsAssessees] =
    useState<TdsOption[]>([]);

  const [tdsLookupsLoaded, setTdsLookupsLoaded] =
    useState(false);

  /**
   * LOAD VENDORS
   */
  const load = async () => {
    try {

      setLoading(true);

      const res =
        await api.get("/vendors");

      setRows(res.data ?? []);

    } catch (err: any) {

      toast.error(
        err?.response?.data?.error ||
        "Failed to load vendors"
      );

    } finally {

      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const activeOptions = (value: any): TdsOption[] => {
    const rows = Array.isArray(value)
      ? value
      : Array.isArray(value?.data)
        ? value.data
        : [];

    return rows
      .filter((row) => row?.code && row.is_active !== false)
      .map((row) => ({
        code: String(row.code),
        description: row.description ?? "",
        is_active: row.is_active,
      }));
  };

  const loadTdsLookups = async () => {
    try {
      const [sectionsRes, assesseesRes] =
        await Promise.all([
          api.get("/tds-section-codes"),
          api.get("/tds-assessee-codes"),
        ]);

      setTdsSections(activeOptions(sectionsRes.data));
      setTdsAssessees(activeOptions(assesseesRes.data));
      setTdsLookupsLoaded(true);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error ||
        "Failed to load TDS lookup values"
      );
    }
  };

  useEffect(() => {
    if (open && !tdsLookupsLoaded) {
      loadTdsLookups();
    }
  }, [open, tdsLookupsLoaded]);

  /**
   * NEW
   */
  const startNew = async () => {

    setEditing(null);

    setForm({
      ...empty,
      vendor_no: "AUTO",
    });

    setNoSeriesLineId("");

    setOpen(true);
  };

  /**
   * EDIT
   */
  const startEdit = (r: Row) => {

    setEditing(r);

    setForm({
      ...empty,
      ...r,
    });

    setOpen(true);
  };

  /**
   * SAVE
   */
  const save = async () => {
    try {

      const panNo = formatPanNo(form.pan_no);

      if (!panNo) {
        toast.error("PAN No. is required.");
        return;
      }

      if (!PAN_REGEX.test(panNo)) {
        toast.error("Invalid PAN No. Format. Example: ABCDE1234F");
        return;
      }

      if (form.tds_applicable) {
        if (!String(form.tds_section_code ?? "").trim()) {
          toast.error("TDS Section Code is required when TDS is applicable.");
          return;
        }

        if (!String(form.tds_assessee_code ?? "").trim()) {
          toast.error("TDS Assessee Code is required when TDS is applicable.");
          return;
        }

        if (
          tdsSections.length > 0 &&
          !tdsSections.some((option) => option.code === form.tds_section_code)
        ) {
          toast.error("Select a valid TDS Section Code.");
          return;
        }

        if (
          tdsAssessees.length > 0 &&
          !tdsAssessees.some((option) => option.code === form.tds_assessee_code)
        ) {
          toast.error("Select a valid TDS Assessee Code.");
          return;
        }
      }

      const payload: Row = {
        ...form,
        pan_no: panNo,
        no_series_line_id:
          noSeriesLineId || undefined,
      };

      NUMERIC.forEach((k) => {
        payload[k] =
          Number(payload[k] ?? 0);
      });

      Object.keys(payload).forEach((k) => {
        if (payload[k] === "") {
          payload[k] = null;
        }
      });

      if (editing) {

        await api.put(
          `/vendors/${editing.id}`,
          payload
        );

        toast.success("Updated");

      } else {

        await api.post(
          "/vendors",
          payload
        );

        toast.success("Created");
      }

      setOpen(false);

      load();

    } catch (err: any) {

      toast.error(
        err?.response?.data?.error ||
        "Failed to save vendor"
      );
    }
  };

  /**
   * DELETE
   */
  const remove = async (
    id: string
  ) => {
    try {

      if (
        !confirm(
          "Delete this vendor?"
        )
      ) return;

      await api.delete(
        `/vendors/${id}`
      );

      toast.success("Deleted");

      load();

    } catch (err: any) {

      toast.error(
        err?.response?.data?.error ||
        "Failed to delete vendor"
      );
    }
  };

  const set = (
    k: string,
    v: any
  ) =>
    setForm((f) => ({
      ...f,
      [k]: v,
    }));

  if (loading) return <ListPageSkeleton columns={8} rows={7} />;

  return (
    <div>
      <PageHeader
        title="Vendors"
        subtitle="Vendor master list"
        actions={
          <Dialog
            open={open}
            onOpenChange={setOpen}
          >
            <DialogTrigger asChild>
              <Button onClick={startNew}>
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-5xl max-h-[85vh] overflow-y-auto">

              <DialogHeader>
                <DialogTitle>
                  {editing
                    ? "Edit Vendor"
                    : "New Vendor"}
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-3">
                <F
                  label="No."
                  value={form.vendor_no}
                  onChange={(v) =>
                    set("vendor_no", v)
                  }
                />

                {!editing && (
                  <MasterNoSeriesSelect
                    value={noSeriesLineId}
                    codes={[
                      "VENDOR",
                    ]}
                    keywords={[
                      "VENDOR",
                      "VEND",
                      "VE",
                    ]}
                    onChange={setNoSeriesLineId}
                  />
                )}

                <F label="Name" value={form.name} onChange={(v) => set("name", v)} />
                <F label="City" value={form.city} onChange={(v) => set("city", v)} />
                <F label="Phone No." value={form.phone_no} onChange={(v) => set("phone_no", v)} />
                <F label="Email" value={form.email} onChange={(v) => set("email", v)} />
                <F label="GST Registration No." value={form.gst_registration_no} onChange={(v) => set("gst_registration_no", v)} />
                <F label="Address" value={form.address} onChange={(v) => set("address", v)} />
                <Sw label="TDS Applicable" checked={form.tds_applicable} onChange={(v) => set("tds_applicable", v)} />
                <TdsSelect
                  label="TDS Section Code"
                  value={form.tds_section_code}
                  options={tdsSections}
                  placeholder="Select TDS Section Code"
                  onChange={(v) => set("tds_section_code", v)}
                />
                <TdsSelect
                  label="TDS Assessee Code"
                  value={form.tds_assessee_code}
                  options={tdsAssessees}
                  placeholder="Select TDS Assessee Code"
                  onChange={(v) => set("tds_assessee_code", v)}
                />
                <F
                  label="PAN No. *"
                  value={form.pan_no}
                  onChange={(v) => set("pan_no", formatPanNo(v))}
                  maxLength={10}
                  helperText="Format: ABCDE1234F"
                />
                <F label="Lower Deduction Certificate No." value={form.lower_deduction_certificate_no} onChange={(v) => set("lower_deduction_certificate_no", v.toUpperCase())} />
                <F label="Concessional Code" value={form.concessional_code} onChange={(v) => set("concessional_code", v.toUpperCase())} />
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() =>
                    setOpen(false)
                  }
                >
                  Cancel
                </Button>

                <Button
                  onClick={save}
                >
                  Save
                </Button>
              </DialogFooter>

            </DialogContent>
          </Dialog>
        }
      />

      <div className="p-6">
        <div className="rounded border bg-card overflow-x-auto">

          <Table>

            <TableHeader>
              <TableRow>

                <TableHead>
                  No.
                </TableHead>

                <TableHead>
                  Name
                </TableHead>

                <TableHead>
                  City
                </TableHead>

                <TableHead>
                  Phone No.
                </TableHead>

                <TableHead>
                  GST Reg. No.
                </TableHead>

                <TableHead className="text-right">
                  Balance (LCY)
                </TableHead>

                <TableHead className="text-right">
                  Balance Due (LCY)
                </TableHead>

                <TableHead className="w-24" />

              </TableRow>
            </TableHeader>

            <TableBody>

              {loading ? (

                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center text-muted-foreground py-8"
                  >
                    Loading...
                  </TableCell>
                </TableRow>

              ) : rows.length === 0 ? (

                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center text-muted-foreground py-8"
                  >
                    No vendors yet.
                  </TableCell>
                </TableRow>

              ) : (

                rows.map((r) => (
                  <TableRow key={r.id}>

                    <TableCell className="font-medium text-primary">
                      {r.vendor_no}
                    </TableCell>

                    <TableCell>
                      {r.name}
                    </TableCell>

                    <TableCell>
                      {r.city}
                    </TableCell>

                    <TableCell>
                      {r.phone_no}
                    </TableCell>

                    <TableCell>
                      {r.gst_registration_no}
                    </TableCell>

                    <TableCell className="text-right tabular-nums">
                      {Number(
                        r.balance_lcy
                      ).toFixed(2)}
                    </TableCell>

                    <TableCell className="text-right tabular-nums">
                      {Number(
                        r.balance_due_lcy
                      ).toFixed(2)}
                    </TableCell>

                    <TableCell className="text-right">

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          startEdit(r)
                        }
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          remove(r.id)
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>

                    </TableCell>

                  </TableRow>
                ))
              )}

            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function TdsSelect({
  label,
  value,
  options,
  placeholder,
  onChange,
}: {
  label: string;
  value: any;
  options: TdsOption[];
  placeholder: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label className="text-xs">
        {label}
      </Label>

      <Select
        value={value || NONE_VALUE}
        onValueChange={(next) =>
          onChange(next === NONE_VALUE ? "" : next)
        }
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>

        <SelectContent>
          <SelectItem value={NONE_VALUE}>
            {placeholder}
          </SelectItem>

          {options.map((option) => (
            <SelectItem
              key={option.code}
              value={option.code}
            >
              {option.code}
              {option.description
                ? ` - ${option.description}`
                : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function F({
  label,
  value,
  onChange,
  type = "text",
  maxLength,
  helperText,
}: {
  label: string;
  value: any;
  onChange: (v: string) => void;
  type?: string;
  maxLength?: number;
  helperText?: string;
}) {
  return (
    <div>
      <Label className="text-xs">
        {label}
      </Label>

      <Input
        type={type}
        value={value ?? ""}
        maxLength={maxLength}
        onChange={(e) =>
          onChange(e.target.value)
        }
      />

      {helperText && (
        <div className="mt-1 text-[11px] text-muted-foreground">
          {helperText}
        </div>
      )}
    </div>
  );
}

function Sw({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded border px-3 py-2">

      <Label className="text-xs">
        {label}
      </Label>

      <Switch
        checked={!!checked}
        onCheckedChange={onChange}
      />
    </div>
  );
}
