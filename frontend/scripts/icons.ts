import { writeFileSync } from "node:fs";

import { Resvg } from "@resvg/resvg-js";

const night = "#121116";
const moon = "#dfadc4";

const glyph = [
	`<path d="M11.5 4.5 16 9.5l4.5-5" fill="none" stroke="${moon}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`,
	`<rect x="4" y="9.5" width="24" height="18" rx="4.5" fill="${moon}"/>`,
	`<rect x="7" y="12.5" width="18" height="12" rx="2.5" fill="${night}"/>`,
	`<path d="M15.736 14.509A4 4 0 1 0 19.821 19.683 3.3 3.3 0 0 1 15.736 14.509z" fill="${moon}"/>`,
].join("");

const icon = (background: string, scale: number) =>
	`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${background}<g transform="translate(16 16) scale(${scale}) translate(-16 -15.6)">${glyph}</g></svg>\n`;

const rounded = icon(`<rect width="32" height="32" rx="8" fill="${night}"/>`, 1);
// iOS とマスカブルアイコンは OS が角を切るので、背景を全面に塗る。
const apple = icon(`<rect width="32" height="32" fill="${night}"/>`, 1);
// マスカブルは中心から半径 40% の円に収める。
const maskable = icon(`<rect width="32" height="32" fill="${night}"/>`, 0.84);
// Android TV のホーム画面はアプリを 16:9 のバナーで並べる。
const banner = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 36"><rect width="64" height="36" fill="${night}"/><g transform="translate(32 18) scale(0.9) translate(-16 -15.6)">${glyph}</g></svg>\n`;

const png = (svg: string, size: number) =>
	new Resvg(svg, { fitTo: { mode: "width", value: size } }).render().asPng();

// BMP でなく PNG をそのまま格納する。ICO を読むブラウザーはすべて PNG 形式の ICO に対応している。
const ico = (image: Buffer, size: number) => {
	const header = Buffer.alloc(22);
	header.writeUInt16LE(1, 2);
	header.writeUInt16LE(1, 4);
	header.writeUInt8(size, 6);
	header.writeUInt8(size, 7);
	header.writeUInt16LE(1, 10);
	header.writeUInt16LE(32, 12);
	header.writeUInt32LE(image.length, 14);
	header.writeUInt32LE(header.length, 18);
	return Buffer.concat([header, image]);
};

writeFileSync("public/icon.svg", rounded);
writeFileSync("public/favicon.ico", ico(png(rounded, 32), 32));
writeFileSync("public/icon-192.png", png(rounded, 192));
writeFileSync("public/icon-512.png", png(rounded, 512));
writeFileSync("public/apple-touch-icon.png", png(apple, 180));
writeFileSync("public/icon-mask.png", png(maskable, 512));
writeFileSync("../tv/assets/icon.png", png(apple, 1024));
writeFileSync("../tv/assets/tv-banner.png", png(banner, 320));
