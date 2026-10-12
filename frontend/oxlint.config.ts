import { shun_shobon } from "@shun-shobon/oxlint-config";
import type { OxlintOverride } from "oxlint";

const restrict = (files: string, forbidden: string[]): OxlintOverride => ({
	files: [files],
	rules: {
		"no-restricted-imports": [
			"error",
			{
				patterns: [
					{
						group: forbidden,
						allowTypeImports: true,
						message:
							"UI 層の依存方向に反します。AGENTS.md の「ディレクトリ構成」を参照してください",
					},
				],
			},
		],
	},
});

/** API・storage・ブラウザー判定とつなぐのは containers だけにする。 */
const CONNECTIONS = [
	"**/api/client",
	"**/api/queries",
	"**/media/codec-support",
	"**/media/preferences",
	"**/media/viewer-id",
];

export default shun_shobon(
	{},
	{
		overrides: [
			restrict("src/ui/services/**", [
				"react",
				"@videojs/*",
				"**/components/**",
				"**/containers/**",
				"**/hooks/**",
				...CONNECTIONS,
			]),
			restrict("src/ui/hooks/**", ["**/components/**", "**/containers/**", ...CONNECTIONS]),
			restrict("src/ui/components/**", ["**/containers/**", ...CONNECTIONS]),
		],
	},
);
