import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Taxas/margens são armazenadas como fração de 1 (0.05 = 5%), mas pedir isso no formulário
// confunde o usuário. Os campos de percentual mostram/recebem o valor multiplicado por 100 e
// convertem para fração só na hora de enviar ao servidor.
export function fractionToPercent(value: number): number {
  return Math.round(value * 10000) / 100;
}

export function percentToFraction(value: number): number {
  return value / 100;
}
