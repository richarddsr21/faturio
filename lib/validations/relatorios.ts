import { z } from "zod";

export const reportMonthsSchema = z.coerce.number().int().min(2).max(12).catch(3);
