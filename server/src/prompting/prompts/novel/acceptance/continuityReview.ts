import { z } from "zod";
import type { ChapterAcceptanceAssessmentOutput, ChapterAcceptancePromptInput } from "../chapterAcceptance.prompts";

export const continuitySubjectTypeSchema = z.enum([
  "character_profile",
  "character_state",
  "relationship",
  "location",
  "knowledge",
  "resource",
  "timeline",
  "world",
  "other",
]);

export const continuityClassificationSchema = z.enum([
  "consistent",
  "legitimate_progression",
  "intentional_deception",
  "new_information",
  "hard_contradiction",
  "insufficient_evidence",
]);

export const continuityRecommendedActionSchema = z.enum([
  "keep_current",
  "append_state",
  "preserve_fact_and_mark_subjective",
  "revise_current",
  "manual_review",
]);

export const continuityCheckSchema = z.object({
  subject: z.string().trim().min(1),
  subjectType: continuitySubjectTypeSchema,
  attribute: z.string().trim().min(1),
  affectedCharacterNames: z.array(z.string().trim().min(1)).max(4),
  previousFact: z.string().trim().min(1),
  currentFact: z.string().trim().min(1),
  previousEvidence: z.string().trim().min(1).max(350),
  currentEvidence: z.string().trim().min(1).max(350),
  evidenceSource: z.enum(["previous_chapter", "character_baseline"]),
  classification: continuityClassificationSchema,
  verdict: z.enum(["consistent", "conflict", "uncertain"]),
  recommendedAction: continuityRecommendedActionSchema,
  reason: z.string().trim().min(1),
  issueCode: z.string().trim().min(1).nullable(),
});

export class ChapterContinuityReviewValidationError extends Error {
  constructor(readonly code: string) {super(`前后章事实核对未通过（${code}），请连续复制对应正文原句并引用对应 continuity 问题编号。`); this.name="ChapterContinuityReviewValidationError";}
}

const classificationContract = {
  consistent: { verdict: "consistent", actions: ["keep_current"] },
  legitimate_progression: { verdict: "consistent", actions: ["append_state"] },
  intentional_deception: { verdict: "consistent", actions: ["preserve_fact_and_mark_subjective"] },
  new_information: { verdict: "consistent", actions: ["append_state"] },
  hard_contradiction: { verdict: "conflict", actions: ["revise_current", "manual_review"] },
  insufficient_evidence: { verdict: "uncertain", actions: ["manual_review"] },
} as const;

/** AI judges continuity; runtime checks evidence origins and references only. */
export function validateContinuityReview(output: ChapterAcceptanceAssessmentOutput, input: ChapterAcceptancePromptInput) {
  const baseline = input.characterContinuityBaseline ?? [];
  if (!input.previousChapterContent?.trim() && baseline.length === 0) return output;
  const compact=(value:string)=>value.replace(/\s/gu, "");
  const previous=compact(input.previousChapterContent ?? ""), current=compact(input.content);
  if (!output.continuityChecks?.length) throw new ChapterContinuityReviewValidationError("missing_checks");
  for (const check of output.continuityChecks) {
    if (check.evidenceSource === "previous_chapter") {
      if (!compact(check.previousEvidence) || !previous.includes(compact(check.previousEvidence))) {
        throw new ChapterContinuityReviewValidationError("previous_quote_invalid");
      }
    } else {
      const source = baseline.find((fact) => fact.evidence === check.previousEvidence);
      if (!source
        || source.subjectType !== check.subjectType
        || source.attribute !== check.attribute
        || !source.affectedCharacterNames.every((name) => check.affectedCharacterNames.includes(name))
        || (!compact(source.value).includes(compact(check.previousFact))
          && !compact(check.previousFact).includes(compact(source.value)))) {
        throw new ChapterContinuityReviewValidationError("character_baseline_evidence_invalid");
      }
    }
    if (!compact(check.currentEvidence) || !current.includes(compact(check.currentEvidence))) {
      throw new ChapterContinuityReviewValidationError("current_quote_invalid");
    }
    const contract = classificationContract[check.classification];
    if (check.verdict !== contract.verdict || !(contract.actions as readonly string[]).includes(check.recommendedAction)) {
      throw new ChapterContinuityReviewValidationError("classification_contract_invalid");
    }
    if (check.classification === "hard_contradiction" && !output.blockingIssues.some(issue => (
        issue.code === check.issueCode && issue.category === "continuity"
      ))) throw new ChapterContinuityReviewValidationError("conflict_reference_invalid");
    if (check.classification !== "hard_contradiction" && check.issueCode !== null) {
      throw new ChapterContinuityReviewValidationError("non_conflict_issue_reference_invalid");
    }
  }
  return output;
}
