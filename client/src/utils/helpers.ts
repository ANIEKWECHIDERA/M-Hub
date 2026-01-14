const normalizeDate = (date?: string | null) =>
  date ? date.split("T")[0] : "";

const isEqual = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b);
export { normalizeDate, isEqual };
