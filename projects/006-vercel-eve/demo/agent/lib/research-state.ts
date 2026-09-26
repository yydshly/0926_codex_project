import { defineState } from "eve/context";

export type ResearchDecision = {
  repository: string;
  verdict: "research" | "defer";
  reason: string;
  sourceUrl: string;
  recordedAt: string;
};

export const researchDecision = defineState<ResearchDecision | null>(
  "repository-review.decision",
  () => null,
);
