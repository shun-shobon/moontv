/**
 * crypto.randomUUID は安全なコンテキスト限定で、VPN 越しの http アクセスでは使えないため
 * getRandomValues から作る。
 */
export const createViewerId = (): string => {
	const bytes = crypto.getRandomValues(new Uint8Array(16));
	return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
};
