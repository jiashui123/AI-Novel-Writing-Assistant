import type { GenerationContextPackage } from "@ai-novel/shared/types/chapterRuntime";
import type { CharacterContinuityBaselineFact } from "../../../../prompting/prompts/novel/chapterAcceptance.prompts";

type BaselineSubjectType = CharacterContinuityBaselineFact["subjectType"];

function compact(value: string | null | undefined, limit = 180): string {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
}

function createFact(input: {
  characterId: string;
  characterName: string;
  affectedCharacterNames?: string[];
  subjectType: BaselineSubjectType;
  attribute: string;
  value: string | null | undefined;
  source?: string | null;
}): CharacterContinuityBaselineFact | null {
  const value = compact(input.value);
  if (!value) return null;
  const source = compact(input.source, 80);
  return {
    characterId: input.characterId,
    characterName: input.characterName,
    affectedCharacterNames: input.affectedCharacterNames ?? [input.characterName],
    subjectType: input.subjectType,
    attribute: input.attribute,
    value,
    evidence: `${input.characterName}｜${input.attribute}：${value}${source ? `（来源：${source}）` : ""}`,
  };
}

/** Builds a compact, quotable baseline from the exact state used by this chapter. */
export function buildCharacterContinuityBaseline(
  context: GenerationContextPackage,
): CharacterContinuityBaselineFact[] {
  const reviewContext = context.chapterReviewContext ?? context.chapterWriteContext ?? null;
  const participants = reviewContext?.participants ?? context.characterRoster ?? [];
  const hardFactsById = new Map((reviewContext?.characterHardFacts ?? context.characterHardFacts ?? [])
    .map((item) => [item.characterId, item] as const));
  const participantById = new Map(participants.map((item) => [item.id, item] as const));
  const facts: CharacterContinuityBaselineFact[] = [];
  const push = (fact: CharacterContinuityBaselineFact | null) => { if (fact) facts.push(fact); };

  for (const character of participants) {
    const hard = hardFactsById.get(character.id);
    const base = { characterId: character.id, characterName: character.name };
    push(createFact({ ...base, subjectType: "character_profile", attribute: "角色定位", value: hard?.role ?? character.role }));
    push(createFact({ ...base, subjectType: "character_profile", attribute: "身份", value: hard?.identityLabel ?? character.identityLabel }));
    push(createFact({ ...base, subjectType: "character_profile", attribute: "阵营", value: hard?.factionLabel ?? character.factionLabel }));
    push(createFact({ ...base, subjectType: "character_profile", attribute: "性格", value: character.personality }));
    push(createFact({ ...base, subjectType: "character_profile", attribute: "背景", value: character.background }));
    push(createFact({ ...base, subjectType: "character_profile", attribute: "成长方向", value: character.development }));
    push(createFact({ ...base, subjectType: "character_state", attribute: "当前立场", value: hard?.stanceLabel ?? character.stanceLabel }));
    push(createFact({ ...base, subjectType: "character_state", attribute: "战力", value: hard?.powerLevel ?? character.powerLevel }));
    push(createFact({ ...base, subjectType: "character_state", attribute: "境界", value: hard?.realm ?? character.realm }));
    push(createFact({ ...base, subjectType: "character_state", attribute: "可行动状态", value: hard?.availability ?? character.availability }));
    push(createFact({ ...base, subjectType: "character_state", attribute: "当前状态", value: hard?.currentState ?? character.currentState }));
    push(createFact({ ...base, subjectType: "character_state", attribute: "当前目标", value: hard?.currentGoal ?? character.currentGoal }));
    push(createFact({ ...base, subjectType: "character_state", attribute: "禁止事项", value: hard?.prohibitions?.join("；") ?? character.prohibitions?.join("；") }));
    const location = hard?.locationState ?? character.locationState;
    push(createFact({
      ...base,
      subjectType: "location",
      attribute: "当前位置",
      value: location?.currentLocation ?? hard?.currentLocation ?? character.currentLocation,
      source: location?.sourceChapterOrder ? `第${location.sourceChapterOrder}章正文` : location?.source === "profile" ? "角色档案" : null,
    }));
  }

  for (const relation of reviewContext?.activeRelationStages ?? []) {
    const value = compact([relation.stageLabel, relation.stageSummary].filter(Boolean).join("："));
    const fact = createFact({
      characterId: `${relation.sourceCharacterId}:${relation.targetCharacterId}`,
      characterName: `${relation.sourceCharacterName}—${relation.targetCharacterName}`,
      affectedCharacterNames: [relation.sourceCharacterName, relation.targetCharacterName],
      subjectType: "relationship",
      attribute: "当前关系阶段",
      value,
    });
    if (fact) facts.push(fact);
  }

  for (const state of context.stateSnapshot?.informationStates ?? []) {
    if (!state.holderRefId || !participantById.has(state.holderRefId)) continue;
    const character = participantById.get(state.holderRefId)!;
    push(createFact({
      characterId: character.id,
      characterName: character.name,
      subjectType: "knowledge",
      attribute: "知情边界",
      value: `${state.status}：${state.fact}`,
    }));
  }

  return facts.slice(0, 80);
}
