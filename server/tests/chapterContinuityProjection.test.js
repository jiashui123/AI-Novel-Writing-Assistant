const test = require("node:test");
const assert = require("node:assert/strict");

test("章节连续性投影去重并保留结构化证据", async () => {
  const { extractChapterContinuityChecks } = await import("../../shared/dist/utils/chapterContinuity.js");
  const check = {
    subject: "沈砚",
    subjectType: "character_profile",
    attribute: "阵营",
    affectedCharacterNames: ["沈砚"],
    previousFact: "沈砚效忠北府",
    currentFact: "沈砚从未加入北府",
    previousEvidence: "角色资料：阵营=北府",
    currentEvidence: "他从未踏进过北府的大门。",
    evidenceSource: "character_baseline",
    classification: "hard_contradiction",
    verdict: "conflict",
    recommendedAction: "revise_current",
    reason: "本章否定了稳定阵营资料，且没有交代转变。",
    issueCode: "continuity.faction",
  };
  const legacyScoreJson = JSON.stringify({ continuityChecks: [check] });
  const result = extractChapterContinuityChecks([{ legacyScoreJson }, { legacyScoreJson }]);
  assert.equal(result.length, 1);
  assert.deepEqual(result[0], check);
});

test("章节连续性投影忽略损坏和不完整的历史载荷", async () => {
  const { extractChapterContinuityChecks } = await import("../../shared/dist/utils/chapterContinuity.js");
  const result = extractChapterContinuityChecks([
    { legacyScoreJson: "not-json" },
    { legacyScoreJson: JSON.stringify({ continuityChecks: [{ subject: "缺少结构" }] }) },
    { legacyScoreJson: JSON.stringify({ continuityChecks: [{
      subject: "沈砚",
      subjectType: "character_profile",
      attribute: "阵营",
      affectedCharacterNames: ["沈砚"],
      previousFact: "效忠北府",
      currentFact: "从未加入北府",
      previousEvidence: "阵营=北府",
      currentEvidence: "从未加入北府。",
      evidenceSource: "character_baseline",
      classification: "hard_contradiction",
      verdict: "consistent",
      recommendedAction: "keep_current",
      reason: "故意破坏分类合同",
      issueCode: null,
    }] }) },
    { legacyScoreJson: null },
  ]);
  assert.deepEqual(result, []);
});
