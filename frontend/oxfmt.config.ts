import { shun_shobon } from "@shun-shobon/oxfmt-config";

// shun_shobon は設定を浅くマージするため、sortTailwindcss を渡すと共有設定の functions は引き継がれない。
export default shun_shobon(
	{},
	{ sortTailwindcss: { functions: ["clsx"], stylesheet: "./src/index.css" } },
);
