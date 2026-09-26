import { defineTool } from "eve/tools";
import { z } from "zod";

type GitHubRepository = {
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  default_branch: string;
  stargazers_count: number;
  pushed_at: string | null;
  license: { spdx_id: string; name: string } | null;
  archived: boolean;
};

export default defineTool({
  description: "读取公开 GitHub 仓库的实时元数据，供研究筛选使用。输入 owner/repo。",
  inputSchema: z.object({
    repository: z
      .string()
      .regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/, "使用 owner/repo 格式"),
  }),
  async execute({ repository }) {
    const [owner, name] = repository.split("/");
    const apiUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
    const response = await fetch(apiUrl, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "eve-repository-review-demo",
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return {
        ok: false as const,
        status: response.status,
        message: "GitHub 请求失败；未获得可用于判断的实时数据。",
        sourceUrl: `https://github.com/${repository}`,
      };
    }

    const data = (await response.json()) as GitHubRepository;
    return {
      ok: true as const,
      repository: data.full_name,
      description: data.description,
      homepage: data.homepage,
      defaultBranch: data.default_branch,
      stars: data.stargazers_count,
      lastPushAt: data.pushed_at,
      license: data.license?.spdx_id ?? null,
      archived: data.archived,
      sourceUrl: data.html_url,
      fetchedAt: new Date().toISOString(),
    };
  },
});
