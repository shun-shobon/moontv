import { shun_shobon } from "@shun-shobon/oxlint-config";
import type { OxlintOverride } from "oxlint";

const CONNECTIONS = [
	"**/api/client",
	"**/api/queries",
	"**/media/codec-support",
	"**/media/media-session",
	"**/media/preferences",
	"**/media/viewer-id",
];

const SCOPES: Record<string, string[]> = {
	"src/app": [],
	"src/features": ["**/app/**"],
	"src/shared": ["**/features/**", "**/app/**"],
};

/** 同じパスに複数の override が当たると後のものが勝つため、containers/hooks を素通しにする containers を最後に置く。 */
const LAYERS: Record<string, string[]> = {
	components: ["**/containers/**", ...CONNECTIONS],
	hooks: ["**/components/**", "**/containers/**", ...CONNECTIONS],
	services: [
		"react",
		"@videojs/*",
		"**/components/**",
		"**/containers/**",
		"**/hooks/**",
		...CONNECTIONS,
	],
	containers: [],
};

const restrict = (files: string, forbidden: string[]): OxlintOverride => ({
	files: [files],
	rules: {
		"no-restricted-imports": [
			forbidden.length === 0 ? "off" : "error",
			{
				patterns: [
					{
						group: forbidden,
						allowTypeImports: true,
						message: "依存方向に反します。AGENTS.md の「ディレクトリ構成」を参照してください",
					},
				],
			},
		],
	},
});

const overrides = Object.entries(SCOPES).flatMap(([scope, scopeForbidden]) => {
	const layerOverrides = Object.entries(LAYERS).map(([layer, layerForbidden]) =>
		restrict(`${scope}/**/${layer}/**`, scopeForbidden.concat(layerForbidden)),
	);
	return [restrict(`${scope}/**`, scopeForbidden)].concat(layerOverrides);
});

export default shun_shobon({}, { overrides });
