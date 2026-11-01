const test = require("node:test");
const assert = require("node:assert/strict");

const {
  pickApplicableCoreProfileFields,
} = require("../dist/services/novel/characterProfile/CharacterCoreProfileService.js");
const {
  characterCoreProfileOutputSchema,
} = require("../dist/prompting/prompts/novel/characterCoreProfile.promptSchemas.js");

test("角色内核建议只补空缺，不覆盖作者资料", () => {
  const result = pickApplicableCoreProfileFields({
    existing: {
      personality: "遇到压力时先观察证据，再做决定。",
      outerGoal: null,
    },
    suggested: {
      personality: "冲动而直接。",
      outerGoal: "找到失踪的姐姐并查清旧案。",
    },
  });

  assert.equal(result.fields.personality, undefined);
  assert.equal(result.fields.outerGoal, "找到失踪的姐姐并查清旧案。");
  assert.equal(result.skippedFields.personality, "已有作者或正史资料");
});

test("角色内核结构化输出要求完整的长期角色维度", () => {
  const output = Object.fromEntries([
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
  ].map((field) => [field, `${field} 的具体角色约束`]));
  assert.equal(characterCoreProfileOutputSchema.safeParse({
    ...output,
    confidence: 0.8,
    warnings: [],
  }).success, true);
  assert.equal(characterCoreProfileOutputSchema.safeParse({
    ...output,
    secret: "",
    confidence: 0.8,
    warnings: [],
  }).success, false);
});
