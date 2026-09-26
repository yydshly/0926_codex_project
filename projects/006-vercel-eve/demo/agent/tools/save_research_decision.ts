import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { z } from "zod";
import { researchDecision } from "../lib/research-state.js";

export default defineTool({
  description: "在本次会话中保存仓库研究判断。写入前必须由人批准。",
  inputSchema: z.object({
    repository: z
      .string()
      .regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/, "使用 owner/repo 格式"),
    verdict: z.enum(["research", "defer"]),
    reason: z.string().min(1).max(1000),
  }),
  approval: always(),
  execute({ repository, verdict, reason }) {
    const decision = {
      repository,
      verdict,
      reason,
      sourceUrl: `https://github.com/${repository}`,
      recordedAt: new Date().toISOString(),
    };
    researchDecision.update(() => decision);
    return decision;
  },
});
