import { useMemo } from "react";
import type {
  AuditReport,
  ChapterContinuityCheck,
  ChapterContinuityClassification,
  ChapterContinuityRecommendedAction,
  ChapterContinuitySubjectType,
} from "@ai-novel/shared/types/novel";
import { extractChapterContinuityChecks } from "@ai-novel/shared/utils/chapterContinuity";
import AiButton from "@/components/common/AiButton";
import { Badge } from "@/components/ui/badge";

const CLASSIFICATION_LABELS: Record<ChapterContinuityClassification, string> = {
  consistent: "前后一致",
  legitimate_progression: "合理成长",
  intentional_deception: "角色欺骗或误判",
  new_information: "新增资料",
  hard_contradiction: "无铺垫硬冲突",
  insufficient_evidence: "证据不足",
};

const ACTION_LABELS: Record<ChapterContinuityRecommendedAction, string> = {
  keep_current: "保留当前表达",
  append_state: "作为新状态记录",
  preserve_fact_and_mark_subjective: "保留正史并标记主观说法",
  revise_current: "修正当前章节",
  manual_review: "人工核对资料与正文",
};

const SUBJECT_LABELS: Record<ChapterContinuitySubjectType, string> = {
  character_profile: "稳定档案",
  character_state: "当前状态",
  relationship: "角色关系",
  location: "人物位置",
  knowledge: "知情范围",
  resource: "持有资源",
  timeline: "时间顺序",
  world: "世界规则",
  other: "其他事实",
};

function ContinuityCheckItem({ check }: { check: ChapterContinuityCheck }) {
  const needsAttention = check.classification === "hard_contradiction" || check.classification === "insufficient_evidence";
  return (
    <article className={needsAttention ? "bg-amber-50/70 px-3 py-3 dark:bg-amber-950/20" : "bg-muted/20 px-3 py-3"}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={check.classification === "hard_contradiction" ? "default" : "secondary"}>
          {CLASSIFICATION_LABELS[check.classification]}
        </Badge>
        <span className="text-sm font-medium text-foreground">{check.subject} · {check.attribute}</span>
        <span className="text-xs text-muted-foreground">{SUBJECT_LABELS[check.subjectType]}</span>
      </div>
      {check.affectedCharacterNames.length > 0 ? (
        <div className="mt-2 text-xs text-muted-foreground">涉及角色：{check.affectedCharacterNames.join("、")}</div>
      ) : null}
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div>
          <div className="text-xs font-medium text-muted-foreground">
            {check.evidenceSource === "previous_chapter" ? "前文事实" : "角色资料基线"}
          </div>
          <div className="mt-1 text-sm leading-6 text-foreground">{check.previousFact}</div>
          <blockquote className="mt-2 border-l-2 border-border pl-2 text-xs leading-5 text-muted-foreground">
            {check.previousEvidence}
          </blockquote>
        </div>
        <div>
          <div className="text-xs font-medium text-muted-foreground">本章表达</div>
          <div className="mt-1 text-sm leading-6 text-foreground">{check.currentFact}</div>
          <blockquote className="mt-2 border-l-2 border-border pl-2 text-xs leading-5 text-muted-foreground">
            {check.currentEvidence}
          </blockquote>
        </div>
      </div>
      <div className="mt-3 text-sm leading-6 text-muted-foreground">判断：{check.reason}</div>
      <div className="mt-1 text-xs font-medium text-foreground">建议：{ACTION_LABELS[check.recommendedAction]}</div>
    </article>
  );
}

export default function CharacterContinuityReviewPanel(props: {
  auditReports: AuditReport[];
  onRepairChapter: () => void;
  isRepairingChapter: boolean;
}) {
  const checks = useMemo(
    () => extractChapterContinuityChecks(props.auditReports),
    [props.auditReports],
  );
  const hardContradictionCount = checks.filter((check) => check.classification === "hard_contradiction").length;
  if (checks.length === 0) return null;

  return (
    <section className="space-y-3 bg-background px-4 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-foreground">角色连续性核对</div>
          <div className="mt-1 text-xs leading-5 text-muted-foreground">
            AI 对照前文和角色资料判断变化是否合理。合理成长、角色误判和新增信息不会被当成矛盾。
          </div>
        </div>
        {hardContradictionCount > 0 ? (
          <AiButton
            size="sm"
            variant="secondary"
            className="shrink-0"
            onClick={props.onRepairChapter}
            disabled={props.isRepairingChapter}
          >
            {props.isRepairingChapter ? "正在修复本章..." : `修复 ${hardContradictionCount} 处硬冲突`}
          </AiButton>
        ) : null}
      </div>
      <div className="space-y-2">
        {checks.map((check) => (
          <ContinuityCheckItem
            key={`${check.subjectType}:${check.subject}:${check.attribute}:${check.currentEvidence}`}
            check={check}
          />
        ))}
      </div>
    </section>
  );
}
