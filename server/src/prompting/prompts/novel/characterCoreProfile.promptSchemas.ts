import { z } from "zod";

const profileText = z.string().trim().min(4).max(240);

export const characterCoreProfileOutputSchema = z.object({
  storyFunction: profileText,
  relationToProtagonist: profileText,
  personality: profileText,
  background: profileText,
  development: profileText,
  outerGoal: profileText,
  innerNeed: profileText,
  fear: profileText,
  wound: profileText,
  misbelief: profileText,
  secret: profileText,
  moralLine: profileText,
  firstImpression: profileText,
  confidence: z.number().min(0).max(1),
  warnings: z.array(z.string().trim().min(1).max(160)).max(8).default([]),
});

export type CharacterCoreProfileOutput = z.infer<typeof characterCoreProfileOutputSchema>;
