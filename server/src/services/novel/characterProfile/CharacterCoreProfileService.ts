import type {
  Character,
  CharacterCoreProfileApplyResult,
  CharacterCoreProfileField,
  CharacterCoreProfileFields,
  CharacterCoreProfileSuggestion,
} from "@ai-novel/shared/types/novel";
import { prisma } from "../../../db/prisma";
import { runStructuredPrompt } from "../../../prompting/core/promptRunner";
import { characterCoreProfileCompletionPrompt } from "../../../prompting/prompts/novel/characterCoreProfile.prompts";
import { buildStoryModePromptBlock, normalizeStoryModeOutput } from "../../storyMode/storyModeProfile";
import type { LLMGenerateOptions } from "../novelCoreShared";
import { WorldContextGateway } from "../worldContext/WorldContextGateway";

export interface CharacterCoreProfileGenerateOptions extends LLMGenerateOptions {
  userGuidance?: string;
}

export const CORE_PROFILE_FIELDS: CharacterCoreProfileField[] = [
  "storyFunction",
  "relationToProtagonist",
  "personality",
  "background",
  "development",
  "outerGoal",
  "innerNeed",
  "fear",
  "wound",
  "misbelief",
  "secret",
  "moralLine",
  "firstImpression",
];

const FIELD_LABELS: Record<CharacterCoreProfileField, string> = {
  storyFunction: "故事作用",
  relationToProtagonist: "与主角关系",
  personality: "性格与压力反应",
  background: "关键背景",
  development: "成长方向",
  outerGoal: "外在目标",
  innerNeed: "内在需求",
  fear: "核心恐惧",
  wound: "心理伤口",
  misbelief: "错误信念",
  secret: "隐藏秘密",
  moralLine: "道德底线",
  firstImpression: "初见印象",
};

type CoreProfileRow = Pick<Character, "id" | "name" | "role"> & CharacterCoreProfileFields & {
  castRole?: string | null;
  identityLabel?: string | null;
  factionLabel?: string | null;
  stanceLabel?: string | null;
  powerLevel?: string | null;
  realm?: string | null;
  currentLocation?: string | null;
  availability?: string | null;
  currentState?: string | null;
  currentGoal?: string | null;
};

const normalizeText = (value: unknown): string => String(value ?? "").replace(/\s+/g, " ").trim();

function compactText(value: unknown, limit = 800): string {
  const normalized = normalizeText(value);
  return normalized.length > limit ? `${normalized.slice(0, limit)}...` : normalized;
}

export function pickApplicableCoreProfileFields(input: {
  existing: CharacterCoreProfileFields;
  suggested: CharacterCoreProfileFields;
}): {
  fields: CharacterCoreProfileFields;
  skippedFields: Partial<Record<CharacterCoreProfileField, string>>;
} {
  const fields: CharacterCoreProfileFields = {};
  const skippedFields: Partial<Record<CharacterCoreProfileField, string>> = {};
  for (const field of CORE_PROFILE_FIELDS) {
    if (normalizeText(input.existing[field])) {
      skippedFields[field] = "已有作者或正史资料";
      continue;
    }
    const suggested = normalizeText(input.suggested[field]);
    if (!suggested) {
      skippedFields[field] = "AI 未给出可靠建议";
      continue;
    }
    fields[field] = suggested;
  }
  return { fields, skippedFields };
}

function extractCoreFields(character: CoreProfileRow): CharacterCoreProfileFields {
  return Object.fromEntries(CORE_PROFILE_FIELDS.map((field) => [field, character[field] ?? null]));
}

function buildExistingProfile(character: CoreProfileRow): string {
  return [
    character.castRole ? `阵容位置：${character.castRole}` : "",
    ...CORE_PROFILE_FIELDS.map((field) => {
      const value = normalizeText(character[field]);
      return value ? `${FIELD_LABELS[field]}：${value}` : "";
    }),
    character.identityLabel ? `身份：${character.identityLabel}` : "",
    character.factionLabel ? `阵营：${character.factionLabel}` : "",
    character.stanceLabel ? `立场：${character.stanceLabel}` : "",
    character.powerLevel ? `能力层级：${character.powerLevel}` : "",
    character.realm ? `境界：${character.realm}` : "",
    character.currentLocation ? `当前位置：${character.currentLocation}` : "",
    character.availability ? `可行动性：${character.availability}` : "",
    character.currentState ? `当前状态：${character.currentState}` : "",
    character.currentGoal ? `当前目标：${character.currentGoal}` : "",
  ].filter(Boolean).join("\n");
}

export class CharacterCoreProfileService {
  private readonly worldContextGateway = new WorldContextGateway();

  async generateCharacterCoreProfile(
    novelId: string,
    characterId: string,
    options: CharacterCoreProfileGenerateOptions = {},
  ): Promise<CharacterCoreProfileSuggestion> {
    const [novel, character, relations] = await Promise.all([
      prisma.novel.findUnique({
        where: { id: novelId },
        include: {
          genre: true,
          bible: true,
          bookContract: true,
          storyMacroPlan: true,
          primaryStoryMode: true,
          secondaryStoryMode: true,
        },
      }),
      prisma.character.findFirst({ where: { id: characterId, novelId } }),
      prisma.characterRelation.findMany({
        where: { novelId, OR: [{ sourceCharacterId: characterId }, { targetCharacterId: characterId }] },
        include: {
          sourceCharacter: { select: { name: true } },
          targetCharacter: { select: { name: true } },
        },
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        take: 12,
      }),
    ]);
    if (!novel || !character) throw new Error("小说或角色不存在");

    const existing = extractCoreFields(character);
    if (CORE_PROFILE_FIELDS.every((field) => normalizeText(existing[field]))) {
      return {
        characterId,
        characterName: character.name,
        fields: {},
        skippedFields: Object.fromEntries(CORE_PROFILE_FIELDS.map((field) => [field, "已有作者或正史资料"])),
        confidence: 1,
        warnings: ["角色核心资料已完整，没有需要补写的字段。"],
        hasApplicableChanges: false,
      };
    }

    const storyModeBlock = buildStoryModePromptBlock({
      primary: novel.primaryStoryMode ? normalizeStoryModeOutput(novel.primaryStoryMode) : null,
      secondary: novel.secondaryStoryMode ? normalizeStoryModeOutput(novel.secondaryStoryMode) : null,
    });
    const worldContext = await this.worldContextGateway.getWorldContextBlock(novelId, {
      purpose: "character",
      provider: options.provider,
      model: options.model,
      temperature: options.temperature,
    });
    const relationText = relations.map((relation) => [
      `${relation.sourceCharacter.name} → ${relation.targetCharacter.name}`,
      relation.surfaceRelation,
      relation.hiddenTension ? `暗线：${relation.hiddenTension}` : "",
      relation.conflictSource ? `冲突：${relation.conflictSource}` : "",
      relation.secretAsymmetry ? `信息差：${relation.secretAsymmetry}` : "",
    ].filter(Boolean).join("；")).join("\n");

    const result = await runStructuredPrompt({
      asset: characterCoreProfileCompletionPrompt,
      promptInput: {
        novelTitle: novel.title,
        genreName: novel.genre?.name ?? "未指定",
        storyModeBlock: compactText(storyModeBlock, 900),
        bookContractText: compactText([
          novel.bookContract?.readingPromise,
          novel.bookContract?.protagonistFantasy,
          novel.bookContract?.coreSellingPoint,
          novel.bookContract?.relationshipMainline,
          novel.bookContract?.escalationLadder,
        ].filter(Boolean).join("\n"), 1_200),
        worldContextText: compactText(worldContext?.promptBlock, 1_600),
        bibleText: compactText([
          novel.bible?.mainPromise,
          novel.bible?.coreSetting,
          novel.bible?.characterArcs,
          novel.bible?.worldRules,
        ].filter(Boolean).join("\n"), 1_200),
        storyMacroText: compactText([
          novel.storyMacroPlan?.storyInput,
          novel.storyMacroPlan?.decompositionJson,
          novel.storyMacroPlan?.constraintEngineJson,
        ].filter(Boolean).join("\n"), 1_400),
        characterName: character.name,
        characterRole: character.role,
        existingProfile: compactText(buildExistingProfile(character), 2_400),
        relationText: compactText(relationText, 1_400),
        userGuidance: compactText(options.userGuidance, 800),
      },
      options: {
        provider: options.provider,
        model: options.model,
        temperature: options.temperature ?? 0.4,
        maxTokens: 2_200,
        novelId,
        stage: "character_core_profile",
      },
    });

    const output = result.output;
    const suggested = Object.fromEntries(CORE_PROFILE_FIELDS.map((field) => [field, output[field]]));
    const applicable = pickApplicableCoreProfileFields({ existing, suggested });
    const warnings = [...output.warnings];
    if (output.confidence < 0.55) {
      warnings.push("AI 对角色内核把握较低，本次不提供可写入建议。");
      return {
        characterId,
        characterName: character.name,
        fields: {},
        skippedFields: Object.fromEntries(CORE_PROFILE_FIELDS.map((field) => [field, "AI 把握较低"])),
        confidence: output.confidence,
        warnings,
        hasApplicableChanges: false,
      };
    }
    return {
      characterId,
      characterName: character.name,
      fields: applicable.fields,
      skippedFields: applicable.skippedFields,
      confidence: output.confidence,
      warnings,
      hasApplicableChanges: Object.keys(applicable.fields).length > 0,
    };
  }

  async applyCharacterCoreProfile(
    novelId: string,
    characterId: string,
    fields: CharacterCoreProfileFields,
  ): Promise<CharacterCoreProfileApplyResult> {
    return prisma.$transaction(async (tx) => {
      const current = await tx.character.findFirst({ where: { id: characterId, novelId } });
      if (!current) throw new Error("角色不存在");
      const applicable = pickApplicableCoreProfileFields({ existing: extractCoreFields(current), suggested: fields });
      const appliedFields: CharacterCoreProfileField[] = [];
      for (const field of CORE_PROFILE_FIELDS) {
        const value = applicable.fields[field];
        if (!normalizeText(value)) continue;
        const result = await tx.character.updateMany({
          where: { id: characterId, novelId, [field]: current[field] },
          data: { [field]: value },
        });
        if (result.count === 1) appliedFields.push(field);
        else applicable.skippedFields[field] = "生成后资料已被作者更新";
      }
      const character = await tx.character.findUniqueOrThrow({ where: { id: characterId } });
      return {
        character: character as unknown as Character,
        appliedFields,
        skippedFields: applicable.skippedFields,
        warnings: appliedFields.length ? [] : ["没有可写入的核心资料。"],
      };
    });
  }
}
