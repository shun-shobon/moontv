import { shun_shobon } from "@shun-shobon/oxlint-config";

// Metro は設定を CommonJS で読むため、型付きの規則が require の戻り値を any として咎める。
export default shun_shobon({ ignores: ["metro.config.cjs"] });
