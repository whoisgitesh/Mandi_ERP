import * as React from "react";

import { Input } from "@/components/ui/input";

type NumericInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "type" | "value" | "onChange" | "min" | "max"
> & {
  value?: string | number | null;
  onChange?: (value: string) => void;
  onValueChange?: (value: number) => void;
  decimalScale?: number;
  min?: number;
  max?: number;
  allowNegative?: boolean;
};

const normalizeNumericText = (
  value: string,
  allowNegative = false,
  decimalScale?: number
) => {
  let next = value.replace(/,/g, "");
  next = next.replace(allowNegative ? /[^0-9.-]/g : /[^0-9.]/g, "");

  if (allowNegative) {
    next = next.replace(/(?!^)-/g, "");
  }

  const [whole, ...decimalParts] = next.split(".");
  if (decimalParts.length > 0) {
    const decimal = decimalParts.join("");
    const limitedDecimal =
      typeof decimalScale === "number"
        ? decimal.slice(0, decimalScale)
        : decimal;
    next = `${whole}.${limitedDecimal}`;
  }

  return next;
};

const clamp = (
  value: number,
  min?: number,
  max?: number
) => {
  let next = value;
  if (typeof min === "number") next = Math.max(next, min);
  if (typeof max === "number") next = Math.min(next, max);
  return next;
};

const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  (
    {
      value,
      onChange,
      onValueChange,
      onBlur,
      onFocus,
      decimalScale,
      min,
      max,
      allowNegative = false,
      inputMode = "decimal",
      ...props
    },
    ref
  ) => {
    const [draft, setDraft] = React.useState(value ?? "");
    const focusedRef = React.useRef(false);

    React.useEffect(() => {
      if (!focusedRef.current) {
        setDraft(value ?? "");
      }
    }, [value]);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const text = normalizeNumericText(
        event.target.value,
        allowNegative,
        decimalScale
      );

      setDraft(text);
      onChange?.(text);
      onValueChange?.(clamp(Number(text || 0), min, max));
    };

    const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
      focusedRef.current = true;
      onFocus?.(event);
    };

    const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
      focusedRef.current = false;
      onBlur?.(event);
    };

    return (
      <Input
        {...props}
        ref={ref}
        type="text"
        inputMode={inputMode}
        value={draft}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
    );
  }
);

NumericInput.displayName = "NumericInput";

export { NumericInput };
