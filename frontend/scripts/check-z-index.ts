import { glob, readFile } from "node:fs/promises";

const NON_ROLE_Z = /(?<![\w-])-?z-(?:\d|\[|\()/u;

const violations: string[] = [];
for await (const file of glob([
	"index.html",
	"src/**/*.{ts,tsx,css}",
	".storybook/**/*.{ts,tsx,html}",
])) {
	const lines = (await readFile(file, "utf8")).split("\n");
	lines.forEach((line, i) => {
		if (NON_ROLE_Z.test(line)) violations.push(`${file}:${i + 1}: ${line.trim()}`);
	});
}

if (violations.length > 0) {
	console.error("z-index は src/index.css の --z-index-* の役割名で指定してください。");
	console.error(violations.join("\n"));
	process.exit(1);
}
