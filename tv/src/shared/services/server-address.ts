/** リモコンで打つ手間を減らすため、スキームとポートは省略できるようにする。 */
const DEFAULT_PORT = "40780";

// RN の URL は hostname や port を実装していないため、自前で分解する。
const ADDRESS = /^(?:(https?):\/\/)?([^/:?#\s]+)(?::(\d+))?\/?$/iu;

export const normalizeServerUrl = (input: string): string | null => {
	// 日本語入力のキーボードでは数字や記号が全角で入る。
	const match = ADDRESS.exec(input.normalize("NFKC").trim());
	if (match == null) {
		return null;
	}
	const [, scheme = "http", host = "", port] = match;
	const lowerScheme = scheme.toLowerCase();
	const resolvedPort = port ?? (lowerScheme === "http" ? DEFAULT_PORT : null);
	return `${lowerScheme}://${host}${resolvedPort == null ? "" : `:${resolvedPort}`}`;
};
