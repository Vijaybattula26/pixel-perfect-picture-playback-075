import { CircleCheck, Lightbulb, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAnalyzer } from "@/hooks/use-analyzer";
import type { ScoreResult } from "@/lib/atsScorer";
import { MAX_APPROVED_KEYWORDS } from "@/lib/constants";
import { MatchedChip, ToggleChip } from "./KeywordChip";

function Group({ icon: Icon, title, count, description, action, children, iconClass }: {
  icon: typeof CircleCheck;
  title: string;
  count: number;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  iconClass: string;
}) {
  return (
    <div className="py-5 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <Icon className={`mt-0.5 size-4 shrink-0 ${iconClass}`} aria-hidden />
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              {title} <span className="ml-1 font-mono text-xs font-medium text-muted-foreground">{count}</span>
            </h4>
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        {action}
      </div>
      <div className="mt-3 pl-6.5">{children}</div>
    </div>
  );
}

export function KeywordReport({ result }: { result: ScoreResult }) {
  const { approvedKeywords, toggleKeyword, setApprovedKeywords } = useAnalyzer();
  const { matchedKeywords, missingKeywords } = result;
  const { missingWithEvidence, realGaps } = missingKeywords;
  const allLikelySelected = missingWithEvidence.length > 0 && missingWithEvidence.every((k) => approvedKeywords.includes(k.keyword));

  return (
    <section aria-labelledby="keywords-heading" className="surface-card p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="keywords-heading" className="text-sm font-semibold tracking-tight text-foreground">
          Keyword gap report
        </h3>
        <p className="text-xs text-muted-foreground" aria-live="polite">
          <span className="font-mono text-foreground">{approvedKeywords.length}</span>/{MAX_APPROVED_KEYWORDS} approved for AI
        </p>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Tap a missing keyword to approve it — only if you can truthfully claim it.
      </p>

      <div className="mt-5 divide-y divide-border">
        <Group
          icon={CircleCheck}
          iconClass="text-score-high"
          title="Matched"
          count={matchedKeywords.length}
          description="Dashed = only in your skills list. Show it in an achievement for full credit."
        >
          {matchedKeywords.length ? (
            <ul className="flex flex-wrap gap-1.5">
              {matchedKeywords.map((k) => (
                <MatchedChip key={k.keyword} keyword={k.keyword} hasEvidence={k.hasEvidence} />
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">No job keywords found in your resume yet.</p>
          )}
        </Group>

        {missingWithEvidence.length > 0 && (
          <Group
            icon={Lightbulb}
            iconClass="text-score-mid-foreground"
            title="You may already have these"
            count={missingWithEvidence.length}
            description="Missing by name, but related skills appear in your resume."
            action={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setApprovedKeywords(
                    allLikelySelected
                      ? approvedKeywords.filter((k) => !missingWithEvidence.some((m) => m.keyword === k))
                      : [...approvedKeywords, ...missingWithEvidence.map((k) => k.keyword)],
                  )
                }
              >
                {allLikelySelected ? "Clear these" : "Approve all"}
              </Button>
            }
          >
            <ul className="flex flex-wrap gap-1.5">
              {missingWithEvidence.map((k) => (
                <ToggleChip
                  key={k.keyword}
                  keyword={k.keyword}
                  selected={approvedKeywords.includes(k.keyword)}
                  onToggle={() => toggleKeyword(k.keyword)}
                  hint={`Related in your resume: ${k.relatedEvidence.join(", ")}`}
                />
              ))}
            </ul>
          </Group>
        )}

        <Group
          icon={TriangleAlert}
          iconClass="text-score-low"
          title="Real gaps"
          count={realGaps.length}
          description="No trace in your resume. Approve only if it's genuinely true — otherwise skip it."
        >
          {realGaps.length ? (
            <ul className="flex flex-wrap gap-1.5">
              {realGaps.map((k) => (
                <ToggleChip
                  key={k.keyword}
                  keyword={k.keyword}
                  selected={approvedKeywords.includes(k.keyword)}
                  onToggle={() => toggleKeyword(k.keyword)}
                />
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">Nothing major missing. Nice.</p>
          )}
        </Group>
      </div>
    </section>
  );
}
