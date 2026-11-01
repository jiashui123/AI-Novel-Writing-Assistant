import { useState } from "react";
import type { Character, CharacterCoreProfileField, CharacterCoreProfileSuggestion } from "@ai-novel/shared/types/novel";
import AiButton from "@/components/common/AiButton";
import SelectControl from "@/components/common/SelectControl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VISIBLE_PROFILE_FIELDS } from "./characterWorkspace.helpers";
import type { EditableCharacterFormProps } from "./characterWorkspace.types";

interface CharacterProfileTabProps extends EditableCharacterFormProps {
  selectedCharacter: Character;
  onGenerateCoreProfile: (userGuidance?: string) => void;
  isGeneratingCoreProfile: boolean;
  coreProfileSuggestion?: CharacterCoreProfileSuggestion | null;
  onApplyCoreProfile: () => void;
  isApplyingCoreProfile: boolean;
  onSyncTimeline: () => void;
  isSyncingTimeline: boolean;
  onSyncAllTimeline: () => void;
  isSyncingAllTimeline: boolean;
  onWorldCheck: () => void;
  isCheckingWorld: boolean;
}

const CORE_PROFILE_FIELDS: Array<{ key: CharacterCoreProfileField; label: string; placeholder: string }> = [
  { key: "storyFunction", label: "故事作用", placeholder: "这个角色持续为主线制造什么作用" },
  { key: "relationToProtagonist", label: "与主角关系", placeholder: "当前关系与核心张力" },
  { key: "personality", label: "性格与压力反应", placeholder: "稳定行为倾向及承压时的反应" },
  { key: "background", label: "关键背景", placeholder: "能够解释当下行动的关键经历" },
  { key: "development", label: "成长方向", placeholder: "可跨中长篇逐步发生的变化" },
  { key: "outerGoal", label: "外在目标", placeholder: "角色主动追求的可见结果" },
  { key: "innerNeed", label: "内在需求", placeholder: "角色真正需要面对或获得什么" },
  { key: "fear", label: "核心恐惧", placeholder: "最害怕失去、面对或成为的事物" },
  { key: "wound", label: "心理伤口", placeholder: "持续影响选择的关键经历" },
  { key: "misbelief", label: "错误信念", placeholder: "角色深信但会限制自己的判断" },
  { key: "secret", label: "隐藏秘密", placeholder: "能制造信息差或选择压力的秘密" },
  { key: "moralLine", label: "道德底线", placeholder: "通常不愿跨越的边界" },
  { key: "firstImpression", label: "初见印象", placeholder: "读者或他人最初如何识别或误读此人" },
];
const CORE_PROFILE_DETAIL_FIELDS = CORE_PROFILE_FIELDS.filter((field) => (
  field.key !== "personality" && field.key !== "background" && field.key !== "development"
));

export default function CharacterProfileTab(props: CharacterProfileTabProps) {
  const {
    characterForm,
    selectedCharacter,
    onGenerateCoreProfile,
    isGeneratingCoreProfile,
    coreProfileSuggestion,
    onApplyCoreProfile,
    isApplyingCoreProfile,
    onCharacterFormChange,
    onSaveCharacter,
    isSavingCharacter,
    onSyncTimeline,
    isSyncingTimeline,
    onSyncAllTimeline,
    isSyncingAllTimeline,
    onWorldCheck,
    isCheckingWorld,
  } = props;
  const [coreProfileGuidance, setCoreProfileGuidance] = useState("");
  const suggestion = coreProfileSuggestion?.characterId === selectedCharacter.id
    ? coreProfileSuggestion
    : null;
  const suggestionEntries = CORE_PROFILE_FIELDS.flatMap((field) => {
    const value = suggestion?.fields[field.key]?.trim();
    return value ? [{ ...field, value }] : [];
  });

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border/70 bg-muted/10 p-4">
        <div className="mb-3">
          <div className="text-sm font-medium">基础档案</div>
          <div className="mt-1 text-xs leading-5 text-muted-foreground">
            这里维护角色进入章节生成时最稳定的资料。当前状态和当前目标会影响后续章节行动判断。
          </div>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <Input
            placeholder="角色名称"
            value={characterForm.name}
            onChange={(event) => onCharacterFormChange("name", event.target.value)}
          />
          <Input
            placeholder="角色定位"
            value={characterForm.role}
            onChange={(event) => onCharacterFormChange("role", event.target.value)}
          />
          <SelectControl
            className="w-full rounded-md border bg-background p-2 text-sm"
            value={characterForm.gender}
            onChange={(event) => onCharacterFormChange("gender", event.target.value)}
          >
            <option value="unknown">性别：未知</option>
            <option value="male">性别：男</option>
            <option value="female">性别：女</option>
            <option value="other">性别：其他</option>
          </SelectControl>
        </div>
      </section>

      <section className="rounded-xl border border-border/70 bg-background p-4">
        <div className="mb-3 text-sm font-medium">当前处境</div>
        <div className="grid gap-2 md:grid-cols-2">
          <Input
            placeholder="当前状态（例如：重伤闭关）"
            value={characterForm.currentState}
            onChange={(event) => onCharacterFormChange("currentState", event.target.value)}
          />
          <Input
            placeholder="当前目标（例如：三个月内突破）"
            value={characterForm.currentGoal}
            onChange={(event) => onCharacterFormChange("currentGoal", event.target.value)}
          />
        </div>
      </section>

      <section className="grid gap-3 xl:grid-cols-3">
        <TextAreaField
          label="性格补充"
          value={characterForm.personality}
          onChange={(value) => onCharacterFormChange("personality", value)}
        />
        <TextAreaField
          label="背景补充"
          value={characterForm.background}
          onChange={(value) => onCharacterFormChange("background", value)}
        />
        <TextAreaField
          label="成长弧补充"
          value={characterForm.development}
          onChange={(value) => onCharacterFormChange("development", value)}
        />
      </section>

      <section className="space-y-3 bg-muted/20 px-4 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-sm font-medium">角色内核</div>
            <div className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">
              这些稳定设定帮助 AI 在长篇中判断角色为什么行动、会如何承受压力。AI 只补空白字段，生成期间你写入的内容也会被保留。
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <AiButton
              size="sm"
              variant="outline"
              onClick={() => onGenerateCoreProfile(coreProfileGuidance)}
              disabled={isGeneratingCoreProfile}
            >
              {isGeneratingCoreProfile ? "分析中..." : "智能补齐空缺"}
            </AiButton>
            {suggestion?.hasApplicableChanges ? (
              <Button size="sm" onClick={onApplyCoreProfile} disabled={isApplyingCoreProfile}>
                {isApplyingCoreProfile ? "写入中..." : `写入 ${suggestionEntries.length} 项建议`}
              </Button>
            ) : null}
          </div>
        </div>
        <textarea
          className="min-h-[68px] w-full rounded-md border bg-background p-2 text-sm"
          placeholder="可选：告诉 AI 你希望保留的方向或不想出现的设定"
          value={coreProfileGuidance}
          onChange={(event) => setCoreProfileGuidance(event.target.value)}
        />

        {suggestion ? (
          <div className="space-y-2 border-l-2 border-primary/40 pl-3">
            <div className="text-xs text-muted-foreground">
              {suggestion.hasApplicableChanges
                ? `已找到 ${suggestionEntries.length} 项可补空缺，写入前可先核对。`
                : "当前资料没有可安全补写的空缺。"}
            </div>
            {suggestion.warnings.map((warning) => (
              <div key={warning} className="text-xs text-amber-700 dark:text-amber-300">{warning}</div>
            ))}
            <div className="grid gap-2 md:grid-cols-2">
              {suggestionEntries.map((item) => (
                <div key={item.key} className="bg-background/70 px-3 py-2">
                  <div className="text-xs font-medium">{item.label}</div>
                  <div className="mt-1 text-sm leading-6 text-muted-foreground">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {CORE_PROFILE_DETAIL_FIELDS.map((field) => (
            <TextAreaField
              key={field.key}
              label={field.label}
              placeholder={field.placeholder}
              value={characterForm[field.key]}
              onChange={(value) => onCharacterFormChange(field.key, value)}
            />
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border/70 bg-background p-4">
        <div className="mb-3 text-sm font-medium">外显字段快速编辑</div>
        <div className="grid gap-2 md:grid-cols-2">
          {VISIBLE_PROFILE_FIELDS.map((field) => (
            <textarea
              key={field.key}
              className="min-h-[72px] w-full rounded-md border bg-background p-2 text-sm"
              placeholder={`${field.label}：${field.placeholder}`}
              value={characterForm[field.key]}
              onChange={(event) => onCharacterFormChange(field.key, event.target.value)}
            />
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-2 rounded-xl border border-border/70 bg-muted/10 p-3">
        <Button size="sm" onClick={onSaveCharacter} disabled={isSavingCharacter}>
          {isSavingCharacter ? "保存中..." : "保存角色资产"}
        </Button>
        <AiButton size="sm" variant="outline" onClick={onSyncTimeline} disabled={isSyncingTimeline}>
          {isSyncingTimeline ? "同步中..." : "同步角色时间线"}
        </AiButton>
        <AiButton size="sm" variant="outline" onClick={onSyncAllTimeline} disabled={isSyncingAllTimeline}>
          {isSyncingAllTimeline ? "同步中..." : "同步全部角色时间线"}
        </AiButton>
        <AiButton size="sm" variant="outline" onClick={onWorldCheck} disabled={isCheckingWorld}>
          {isCheckingWorld ? "检查中..." : "检查世界一致性"}
        </AiButton>
      </div>
    </div>
  );
}

function TextAreaField(props: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block rounded-lg bg-background/70 p-3">
      <span className="text-sm font-medium">{props.label}</span>
      <textarea
        className="mt-2 min-h-[116px] w-full rounded-md border bg-background p-2 text-sm"
        placeholder={props.placeholder}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </label>
  );
}
