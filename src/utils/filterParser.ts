export type BCFilterCondition = {
  raw: string;
  regex: RegExp;
  hasWildcard: boolean;
};

export type BCParsedFilter = {
  type: "or" | "wildcard" | "exact";
  conditions: BCFilterCondition[];
};

const escapeRegex = (value: string) =>
  value.replace(/[.+?^${}()|[\]\\]/g, "\\$&");

const wildcardToRegex = (value: string) => {
  const pattern =
    value
      .split("*")
      .map(escapeRegex)
      .join(".*");

  return new RegExp(`^${pattern}$`, "i");
};

export const parseBCFilter = (value: string): BCParsedFilter => {
  const parts =
    String(value ?? "")
      .split("|")
      .map((part) => part.trim())
      .filter(Boolean);

  const conditions =
    parts.map((part) => {
      const hasWildcard =
        part.includes("*");

      return {
        raw: part,
        regex: hasWildcard
          ? wildcardToRegex(part)
          : new RegExp(`^${escapeRegex(part)}$`, "i"),
        hasWildcard,
      };
    });

  return {
    type:
      conditions.length > 1
        ? "or"
        : conditions.some((condition) => condition.hasWildcard)
          ? "wildcard"
          : "exact",
    conditions,
  };
};

export const matchesBCFilter = (
  candidate: unknown,
  filterValue: string,
  options: {
    containsForPlainText?: boolean;
  } = {}
) => {
  const value =
    String(candidate ?? "");
  const filter =
    String(filterValue ?? "").trim();

  if (!filter) return true;

  const parsed =
    parseBCFilter(filter);

  return parsed.conditions.some((condition) => {
    if (condition.hasWildcard || parsed.type === "or") {
      return condition.regex.test(value);
    }

    return options.containsForPlainText
      ? value.toLowerCase().includes(condition.raw.toLowerCase())
      : condition.regex.test(value);
  });
};
