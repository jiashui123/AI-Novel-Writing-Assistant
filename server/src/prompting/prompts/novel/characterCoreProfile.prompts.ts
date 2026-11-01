import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { z } from "zod";
import type { PromptAsset } from "../../core/promptTypes";
import { characterCoreProfileOutputSchema } from "./characterCoreProfile.promptSchemas";

export interface CharacterCoreProfilePromptInput {
  novelTitle: string;
  genreName: string;
  storyModeBlock: string;
  bookContractText: string;
  worldContextText: string;
  bibleText: string;
  storyMacroText: string;
  characterName: string;
  characterRole: string;
  existingProfile: string;
  relationText: string;
  userGuidance: string;
}

export const characterCoreProfileCompletionPrompt: PromptAsset<
  CharacterCoreProfilePromptInput,
  z.infer<typeof characterCoreProfileOutputSchema>
> = {
  id: "novel.character.core_profile.complete",
  version: "v1",
  taskType: "planner",
  mode: "structured",
  language: "zh",
  contextPolicy: { maxTokensBudget: 0 },
  outputSchema: characterCoreProfileOutputSchema,
  render: (input) => [
    new SystemMessage([
      "你是长篇小说角色架构师。你的任务是补齐角色的稳定叙事内核，帮助初学者写出前后一致、可以持续发展的角色。",
      "只输出符合 Schema 的合法 JSON 对象，不要输出 Markdown、解释或额外文字。",
      "",
      "硬规则：",
      "1. 所有内容使用简体中文。每个字段写成可直接约束后续剧情的具体事实，不写空泛形容词。",
      "2. 只能补足输入中缺失或明显薄弱的部分；已有明确设定是正史，不得改写、反转或用新设定覆盖。",
      "3. storyFunction 写角色为主线制造什么持续作用；relationToProtagonist 写当前关系与核心张力。",
      "4. personality 必须包含稳定行为倾向及压力下的反应；background 只写能解释当下行动的关键经历。",
      "5. development 写可跨中长篇推进的变化方向，不预先锁死结局。outerGoal 与 innerNeed 必须区分外部追求和内在缺口。",
      "6. fear、wound、misbelief 形成可解释的心理因果，但不能把创伤简单等同于性格。",
      "7. secret 必须能产生信息差或选择压力；moralLine 写其通常不愿跨越的边界；firstImpression 写读者最初会如何误读或识别此人。",
      "8. 不补临时位置、伤势、物品、当章情绪或一次性计划；这些属于动态状态。",
      "9. 与世界规则、书级承诺、角色关系冲突时必须保守输出，并在 warnings 标明依据不足。",
      "10. 单字段控制在 12-100 个汉字，整个 JSON 控制在 1800 个汉字以内。",
    ].join("\n")),
    new HumanMessage([
      `小说：${input.novelTitle}`,
      `题材：${input.genreName}`,
      `角色：${input.characterName}（${input.characterRole}）`,
      "",
      "故事模式：", input.storyModeBlock || "暂无",
      "", "书级承诺：", input.bookContractText || "暂无",
      "", "世界上下文：", input.worldContextText || "暂无",
      "", "作品圣经：", input.bibleText || "暂无",
      "", "宏观规划：", input.storyMacroText || "暂无",
      "", "已有角色资料（不可覆盖）：", input.existingProfile || "暂无",
      "", "已有角色关系：", input.relationText || "暂无",
      "", "作者补全倾向：", input.userGuidance || "暂无",
    ].join("\n")),
  ],
};
