import { z } from "zod";
import { fractionToPercent, percentToFraction } from "@/lib/utils";

// Mesma convenção de settings: o banco guarda a comissão como fração (0,14) e o formulário
// pede percentual (14). O schema em fração é o canônico, validado de novo na Server Action.

export const MAX_SALES_CHANNELS = 30;

const name = z
  .string()
  .trim()
  .min(1, "Informe o nome do canal")
  .max(60, "Nome do canal muito longo (máx. 60 caracteres)");
const fixedFee = z
  .number({ error: "Informe a taxa fixa (use 0 se não tiver)" })
  .min(0, "A taxa fixa não pode ser negativa")
  .max(9999.99, "A taxa fixa está alta demais");
const commission = z
  .number({ error: "Informe a comissão (use 0 se não tiver)" })
  .min(0, "A comissão não pode ser negativa");

function channelsSchema<T extends z.ZodType<{ name: string; active: boolean }>>(channel: T) {
  return z
    .array(channel)
    .min(1, "Cadastre ao menos um canal")
    .max(MAX_SALES_CHANNELS, `Máximo de ${MAX_SALES_CHANNELS} canais`)
    .superRefine((channels, ctx) => {
      const seen = new Set<string>();
      channels.forEach((c, index) => {
        const key = c.name.trim().toLocaleLowerCase("pt-BR");
        if (seen.has(key)) {
          ctx.addIssue({ code: "custom", message: "Já existe um canal com esse nome", path: [index, "name"] });
        }
        seen.add(key);
      });
      if (!channels.some((c) => c.active)) {
        ctx.addIssue({ code: "custom", message: "Deixe ao menos um canal ativo para registrar vendas", path: [] });
      }
    });
}

export const salesChannelSchema = z.object({
  id: z.string().uuid().optional(),
  name,
  commission: commission.max(0.9999, "A comissão precisa ser menor que 100%"),
  fixedFee,
  active: z.boolean(),
});

export const salesChannelsSchema = channelsSchema(salesChannelSchema);

export type SalesChannelValues = z.infer<typeof salesChannelSchema>;

export const salesChannelFormSchema = salesChannelSchema.extend({
  commission: commission.max(99.99, "A comissão precisa ser menor que 100%"),
});

export const salesChannelsFormSchema = z.object({ channels: channelsSchema(salesChannelFormSchema) });

export type SalesChannelFormValues = z.infer<typeof salesChannelFormSchema>;

export function channelToPercent(channel: SalesChannelValues): SalesChannelFormValues {
  return { ...channel, commission: fractionToPercent(channel.commission) };
}

export function channelToFraction(channel: SalesChannelFormValues): SalesChannelValues {
  return { ...channel, commission: percentToFraction(channel.commission) };
}
