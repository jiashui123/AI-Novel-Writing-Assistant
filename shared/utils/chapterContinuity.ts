import type {
  AuditReport,
  ChapterContinuityCheck,
  ChapterContinuityClassification,
  ChapterContinuityRecommendedAction,
  ChapterContinuitySubjectType,
} from "../types/novel";

const SUBJECT_TYPES = new Set<ChapterContinuitySubjectType>([
  "character_profile", "character_state", "relationship", "location", "knowledge",
  "resource", "timeline", "world", "other",
]);
const CLASSIFICATIONS = new Set<ChapterContinuityClassification>([
  "consistent", "legitimate_progression", "intentional_deception", "new_information",
  "hard_contradiction", "insufficient_evidence",
]);
const ACTIONS = new Set<ChapterContinuityRecommendedAction>([
  "keep_current", "append_state", "preserve_fact_and_mark_subjective", "revise_current", "manual_review",
]);
const VERDICTS = new Set<ChapterContinuityCheck["verdict"]>(["consistent", "conflict", "uncertain"]);
const EVIDENCE_SOURCES = new Set<ChapterContinuityCheck["evidenceSource"]>(["previous_chapter", "character_baseline"]);
const CLASSIFICATION_CONTRACTS: Record<ChapterContinuityClassification, {
  verdict: ChapterContinuityCheck["verdict"];
  actions: ChapterContinuityRecommendedAction[];
  requiresIssueCode: boolean;
}> = {
  consistent: { verdict: "consistent", actions: ["keep_current"], requiresIssueCode: false },
  legitimate_progression: { verdict: "consistent", actions: ["append_state"], requiresIssueCode: false },
  intentional_deception: { verdict: "consistent", actions: ["preserve_fact_and_mark_subjective"], requiresIssueCode: false },
  new_information: { verdict: "consistent", actions: ["append_state"], requiresIssueCode: false },
  hard_contradiction: { verdict: "conflict", actions: ["revise_current", "manual_review"], requiresIssueCode: true },
  insufficient_evidence: { verdict: "uncertain", actions: ["manual_review"], requiresIssueCode: false },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseCheck(value: unknown): ChapterContinuityCheck | null {
  if (!isRecord(value)) return null;
  const subject = readText(value.subject);
  const attribute = readText(value.attribute);
  const previousFact = readText(value.previousFact);
  const currentFact = readText(value.currentFact);
  const previousEvidence = readText(value.previousEvidence);
  const currentEvidence = readText(value.currentEvidence);
  const reason = readText(value.reason);
  const affectedCharacterNames = Array.isArray(value.affectedCharacterNames)
    ? value.affectedCharacterNames.map(readText).filter((item): item is string => Boolean(item)).slice(0, 4)
    : [];
  if (!subject || !attribute || !previousFact || !currentFact || !previousEvidence || !currentEvidence || !reason
    || !SUBJECT_TYPES.has(value.subjectType as ChapterContinuitySubjectType)
    || !CLASSIFICATIONS.has(value.classification as ChapterContinuityClassification)
    || !ACTIONS.has(value.recommendedAction as ChapterContinuityRecommendedAction)
    || !VERDICTS.has(value.verdict as ChapterContinuityCheck["verdict"])
    || !EVIDENCE_SOURCES.has(value.evidenceSource as ChapterContinuityCheck["evidenceSource"])) return null;
  const issueCode = value.issueCode === null ? null : readText(value.issueCode);
  if (value.issueCode !== null && !issueCode) return null;
  const classification = value.classification as ChapterContinuityClassification;
  const contract = CLASSIFICATION_CONTRACTS[classification];
  if (value.verdict !== contract.verdict
    || !contract.actions.includes(value.recommendedAction as ChapterContinuityRecommendedAction)
    || contract.requiresIssueCode !== Boolean(issueCode)) return null;
  return {
    subject,
    subjectType: value.subjectType as ChapterContinuitySubjectType,
    attribute,
    affectedCharacterNames,
    previousFact,
    currentFact,
    previousEvidence,
    currentEvidence,
    evidenceSource: value.evidenceSource as ChapterContinuityCheck["evidenceSource"],
    classification,
    verdict: value.verdict as ChapterContinuityCheck["verdict"],
    recommendedAction: value.recommendedAction as ChapterContinuityRecommendedAction,
    reason,
    issueCode,
  };
}

/** Reads only the persisted structured contract; invalid or legacy payloads stay invisible instead of being guessed. */
export function extractChapterContinuityChecks(
  reports: Array<Pick<AuditReport, "legacyScoreJson">>,
): ChapterContinuityCheck[] {
  const checks: ChapterContinuityCheck[] = [];
  const seen = new Set<string>();
  for (const report of reports) {
    if (!report.legacyScoreJson?.trim()) continue;
    try {
      const payload: unknown = JSON.parse(report.legacyScoreJson);
      if (!isRecord(payload) || !Array.isArray(payload.continuityChecks)) continue;
      for (const value of payload.continuityChecks.slice(0, 4)) {
        const check = parseCheck(value);
        if (!check) continue;
        const identity = [
          check.subjectType,
          check.subject,
          check.attribute,
          check.previousEvidence,
          check.currentEvidence,
          check.classification,
        ].join("\u0000");
        if (seen.has(identity)) continue;
        seen.add(identity);
        checks.push(check);
      }
    } catch {
      // Historical reports may contain non-JSON scores. They are not continuity evidence.
    }
  }
  return checks;
}
