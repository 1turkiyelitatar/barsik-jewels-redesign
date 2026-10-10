// Открытки 15 локаций — порядок совпадает с LOCATIONS в src/lib/saga.ts.
const files = import.meta.glob("@/assets/locations/loc*.webp", {
  eager: true,
  import: "default",
}) as Record<string, string>;
export const LOCATION_IMG: string[] = Object.keys(files)
  .sort()
  .map((k) => files[k]!);
