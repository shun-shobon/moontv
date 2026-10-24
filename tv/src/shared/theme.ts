import type { TextStyle } from "react-native";

/** frontend/src/index.css の semantic token を sRGB に直したもの。RN は oklch を解釈できない。 */
export const colors = {
	canvas: "#0b0b0e",
	surface: "#121116",
	selected: "#1a181e",
	scrim: "#070609cc",
	video: "#000000",
	line: "#1a181e",
	lineStrong: "#29282e",
	fg: "#eeeef1",
	fgSecondary: "#c1c0c6",
	fgMuted: "#9f9da5",
	fgSubtle: "#7b7981",
	fgAccent: "#dfadc4",
	accent: "#b36c8f",
	onAccent: "#eeeef1",
} as const;

/** 画面は 960×540dp として組む。3m 離れて読めるよう、Web より一回り大きくする。 */
export const text = {
	title: { fontSize: 22, lineHeight: 30, fontWeight: "600" },
	subtitle: { fontSize: 18, lineHeight: 26, fontWeight: "500" },
	heading: { fontSize: 15, lineHeight: 22, fontWeight: "600" },
	body: { fontSize: 15, lineHeight: 22, fontWeight: "400" },
	label: { fontSize: 14, lineHeight: 20, fontWeight: "400" },
	caption: { fontSize: 12, lineHeight: 17, fontWeight: "400" },
} as const satisfies Record<string, TextStyle>;

/** テレビは画面の端が切れて映ることがあるため、内容をこの内側に収める。 */
export const SAFE_INSET = { horizontal: 48, vertical: 27 } as const;
