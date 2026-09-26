import { defineTool } from "eve/tools";
import { z } from "zod";
import { researchDecision } from "../lib/research-state.js";

export default defineTool({
  description: "读取本次会话中经批准保存的最近一条仓库研究判断。",
  inputSchema: z.object({}),
  execute() {
    return { decision: researchDecision.get() };
  },
});
