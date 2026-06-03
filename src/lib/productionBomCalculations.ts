export type ProductionBomQuantityLine = {
  gross_qty?: number | string | null;
  shorting_loss_qty?: number | string | null;
  cutting_loss_qty?: number | string | null;
  peeling_loss_qty?: number | string | null;
  any_other_loss_qty?: number | string | null;
  net_qty?: number | string | null;
  shortage_pct?: number | string | null;
  quantity_per?: number | string | null;
};

const toNumber = (value: number | string | null | undefined) => {
  if (value === "" || value === null || typeof value === "undefined") return 0;
  return Number(value) || 0;
};

const roundTo = (value: number, decimals: number) =>
  Number(value.toFixed(decimals));

export const productionBomLossFields = [
  "shorting_loss_qty",
  "cutting_loss_qty",
  "peeling_loss_qty",
  "any_other_loss_qty",
] as const;

export const productionBomCalculatedSourceFields = [
  "gross_qty",
  ...productionBomLossFields,
] as const;

export function calculateProductionBomLine<T extends ProductionBomQuantityLine>(
  line: T
): T {
  const grossQty = toNumber(line.gross_qty);
  const totalLossQty = productionBomLossFields.reduce(
    (sum, field) => sum + toNumber(line[field]),
    0
  );
  const netQty = Math.max(grossQty - totalLossQty, 0);
  const shortagePct = grossQty > 0 ? (totalLossQty / grossQty) * 100 : 0;

  return {
    ...line,
    net_qty: roundTo(netQty, 4),
    quantity_per: roundTo(netQty, 4),
    shortage_pct: roundTo(shortagePct, 3),
  };
}

export function validateProductionBomLineQuantities(
  line: ProductionBomQuantityLine
) {
  const grossQty = toNumber(line.gross_qty);
  const losses = productionBomLossFields.map((field) => ({
    field,
    value: toNumber(line[field]),
  }));
  const totalLossQty = losses.reduce((sum, loss) => sum + loss.value, 0);

  if (grossQty < 0) return "Gross Qty cannot be negative.";
  if (losses.some((loss) => loss.value < 0)) {
    return "Loss quantities cannot be negative.";
  }
  if (totalLossQty > grossQty) {
    return "Total loss quantity cannot exceed Gross Qty.";
  }

  return null;
}
