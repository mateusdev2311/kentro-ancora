import { z } from 'zod';
import type { PlanName } from './pricing';
export const proposalSchema = z.object({ cliente: z.string().default(''), closer: z.string().default('Vitor Barbalho'), segmento: z.string().default(''), convDia: z.string().nullable().default(null), ticket: z.number().nullable().default(null), perda: z.number().default(0), usuarios: z.number().default(6), plano: z.string().transform(s => s as PlanName).default('Social Pro'), gerada: z.boolean().default(false) });
