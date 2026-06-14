/**
 * Client-side CSV export. Avoids a backend round-trip for the modest list
 * sizes the admin console deals with (a page / queue at a time).
 */

export interface CsvColumn<T> {
  key: string;
  header: string;
  value: (row: T) => unknown;
}

const escapeCell = (value: unknown): string => {
  if (value == null) return "";
  const str = String(value);
  // Quote if the value contains a delimiter, quote or newline.
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export function exportToCsv<T>(
  filename: string,
  rows: T[],
  columns: CsvColumn<T>[],
): void {
  const header = columns.map((c) => escapeCell(c.header)).join(",");
  const body = rows
    .map((row) => columns.map((c) => escapeCell(c.value(row))).join(","))
    .join("\n");
  const csv = `${header}\n${body}`;

  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
