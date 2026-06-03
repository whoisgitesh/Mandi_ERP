const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATE_TIME_RE = /^\d{4}-\d{2}-\d{2}T/;
const US_DATE_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

export const todayDateInput = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const toDateInput = (value: string | null | undefined) => {
  if (!value) return "";

  const text = String(value).trim();

  const dateOnly = text.match(DATE_ONLY_RE);
  if (dateOnly) return dateOnly[0];

  if (ISO_DATE_TIME_RE.test(text)) {
    const date = new Date(text);

    if (!Number.isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");

      return `${year}-${month}-${day}`;
    }
  }

  const usDate = text.match(US_DATE_RE);
  if (usDate) {
    const [, month, day, year] = usDate;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  return text;
};

export const dateInputOrToday = (value: string | null | undefined) =>
  toDateInput(value) || todayDateInput();

export const formatDateDisplay = (value: string | null | undefined) => {
  const date = toDateInput(value);

  if (!date) return "—";

  const [year, month, day] = date.split("-");

  if (!year || !month || !day) return date;

  return `${day}-${month}-${year}`;
};

export const normalizeDateFields = <T extends Record<string, any>>(
  payload: T,
  fields: string[]
) => {
  const next = { ...payload } as Record<string, unknown>;

  fields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(next, field)) {
      const value = next[field];
      next[field] = toDateInput(value == null ? null : String(value)) || null;
    }
  });

  return next as T;
};

export const normalizeDateFieldsWithDefault = <T extends Record<string, any>>(
  payload: T,
  fields: string[]
) => {
  const next = { ...payload } as Record<string, unknown>;

  fields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(next, field)) {
      const value = next[field];
      next[field] = dateInputOrToday(value == null ? null : String(value));
    }
  });

  return next as T;
};
