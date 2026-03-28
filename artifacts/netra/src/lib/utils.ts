import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCoord(coord: number | null | undefined): string {
  if (coord == null) return "Unknown";
  return coord.toFixed(6);
}
