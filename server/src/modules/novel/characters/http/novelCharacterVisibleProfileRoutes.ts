import type { Router } from "express";
import type { ApiResponse } from "@ai-novel/shared/types/api";
import type {
  CharacterCoreProfileApplyResult,
  CharacterCoreProfileSuggestion,
  CharacterVisibleProfileApplyResult,
  CharacterVisibleProfileBatchResult,
  CharacterVisibleProfileSuggestion,
} from "@ai-novel/shared/types/novel";
import { z } from "zod";
import { validate } from "../../../../middleware/validate";
import type { NovelApplicationServices } from "../../../../services/novel/application/NovelApplicationContracts";

const visibleProfileFieldsSchema = z.object({
  appearance: z.string().trim().nullable().optional(),
  physique: z.string().trim().nullable().optional(),
  attireStyle: z.string().trim().nullable().optional(),
  signatureDetail: z.string().trim().nullable().optional(),
  voiceTexture: z.string().trim().nullable().optional(),
  presenceImpression: z.string().trim().nullable().optional(),
}).strict();

const visibleProfileApplySchema = z.object({
  fields: visibleProfileFieldsSchema,
  overwriteExisting: z.boolean().optional(),
});

const visibleProfileBatchApplySchema = z.object({
  items: z.array(z.object({
    characterId: z.string().trim().min(1),
    fields: visibleProfileFieldsSchema,
    overwriteExisting: z.boolean().optional(),
  })).min(1).max(80),
});

const visibleProfileGenerateSchema = z.object({
  provider: z.string().trim().optional(),
  model: z.string().trim().optional(),
  temperature: z.number().min(0).max(2).optional(),
  userGuidance: z.string().trim().max(1200).optional(),
});

const coreProfileFieldsSchema = z.object({
  storyFunction: z.string().trim().nullable().optional(),
  relationToProtagonist: z.string().trim().nullable().optional(),
  personality: z.string().trim().nullable().optional(),
  background: z.string().trim().nullable().optional(),
  development: z.string().trim().nullable().optional(),
  outerGoal: z.string().trim().nullable().optional(),
  innerNeed: z.string().trim().nullable().optional(),
  fear: z.string().trim().nullable().optional(),
  wound: z.string().trim().nullable().optional(),
  misbelief: z.string().trim().nullable().optional(),
  secret: z.string().trim().nullable().optional(),
  moralLine: z.string().trim().nullable().optional(),
  firstImpression: z.string().trim().nullable().optional(),
}).strict();

const coreProfileApplySchema = z.object({ fields: coreProfileFieldsSchema });

interface RegisterNovelCharacterVisibleProfileRoutesInput {
  router: Router;
  novelService: Pick<NovelApplicationServices,
    | "generateCharacterCoreProfile"
    | "applyCharacterCoreProfile"
    | "generateCharacterVisibleProfile"
    | "generateBatchCharacterVisibleProfiles"
    | "applyCharacterVisibleProfile"
    | "applyBatchCharacterVisibleProfiles"
  >;
  idParamsSchema: z.ZodType<{ id: string }>;
  characterParamsSchema: z.ZodType<{ id: string; charId: string }>;
}

export function registerNovelCharacterVisibleProfileRoutes(
  input: RegisterNovelCharacterVisibleProfileRoutesInput,
): void {
  const {
    router,
    novelService,
    idParamsSchema,
    characterParamsSchema,
  } = input;

  router.post(
    "/:id/characters/:charId/core-profile/generate",
    validate({ params: characterParamsSchema, body: visibleProfileGenerateSchema }),
    async (req, res, next) => {
      try {
        const { id, charId } = req.params as z.infer<typeof characterParamsSchema>;
        const data = await novelService.generateCharacterCoreProfile(id, charId, req.body as any);
        res.status(200).json({
          success: true,
          data,
          message: data.hasApplicableChanges ? "角色核心资料建议已生成。" : "当前角色没有需要补写的核心资料。",
        } satisfies ApiResponse<CharacterCoreProfileSuggestion>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/:id/characters/:charId/core-profile/apply",
    validate({ params: characterParamsSchema, body: coreProfileApplySchema }),
    async (req, res, next) => {
      try {
        const { id, charId } = req.params as z.infer<typeof characterParamsSchema>;
        const body = req.body as z.infer<typeof coreProfileApplySchema>;
        const data = await novelService.applyCharacterCoreProfile(id, charId, body.fields);
        res.status(200).json({
          success: true,
          data,
          message: data.appliedFields.length ? "角色核心资料已写入。" : "没有新的核心资料需要写入。",
        } satisfies ApiResponse<CharacterCoreProfileApplyResult>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/:id/characters/:charId/visible-profile/generate",
    validate({ params: characterParamsSchema, body: visibleProfileGenerateSchema }),
    async (req, res, next) => {
      try {
        const { id, charId } = req.params as z.infer<typeof characterParamsSchema>;
        const data = await novelService.generateCharacterVisibleProfile(id, charId, req.body as any);
        res.status(200).json({
          success: true,
          data,
          message: "外显资料建议已生成。",
        } satisfies ApiResponse<CharacterVisibleProfileSuggestion>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/:id/characters/:charId/visible-profile/apply",
    validate({ params: characterParamsSchema, body: visibleProfileApplySchema }),
    async (req, res, next) => {
      try {
        const { id, charId } = req.params as z.infer<typeof characterParamsSchema>;
        const body = req.body as z.infer<typeof visibleProfileApplySchema>;
        const data = await novelService.applyCharacterVisibleProfile(id, charId, body.fields, {
          overwriteExisting: body.overwriteExisting,
        });
        res.status(200).json({
          success: true,
          data,
          message: data.appliedFields.length > 0 ? "外显资料已写入角色卡。" : "没有新的外显资料需要写入。",
        } satisfies ApiResponse<CharacterVisibleProfileApplyResult>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/:id/characters/visible-profile/batch-generate",
    validate({ params: idParamsSchema, body: visibleProfileGenerateSchema }),
    async (req, res, next) => {
      try {
        const { id } = req.params as z.infer<typeof idParamsSchema>;
        const data = await novelService.generateBatchCharacterVisibleProfiles(id, req.body as any);
        res.status(200).json({
          success: true,
          data,
          message: "全书角色外显资料建议已生成。",
        } satisfies ApiResponse<CharacterVisibleProfileBatchResult>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/:id/characters/visible-profile/batch-apply",
    validate({ params: idParamsSchema, body: visibleProfileBatchApplySchema }),
    async (req, res, next) => {
      try {
        const { id } = req.params as z.infer<typeof idParamsSchema>;
        const body = req.body as z.infer<typeof visibleProfileBatchApplySchema>;
        const data = await novelService.applyBatchCharacterVisibleProfiles(id, body.items);
        res.status(200).json({
          success: true,
          data,
          message: "已按确认结果写入角色外显资料。",
        } satisfies ApiResponse<{ novelId: string; results: CharacterVisibleProfileApplyResult[] }>);
      } catch (error) {
        next(error);
      }
    },
  );
}
