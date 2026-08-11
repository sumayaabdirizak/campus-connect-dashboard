export type ExportFilterDetail = { label: string; value: string };

export function filterDetailsToCsvRows(details: ExportFilterDetail[]): (string | number)[][] {
  return details.map((d) => [`Filter · ${d.label}`, d.value]);
}
