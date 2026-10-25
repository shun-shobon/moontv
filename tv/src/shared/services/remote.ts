import type { TVRemoteEvent } from "react-native";

/** Android の KeyEvent.ACTION_DOWN と ACTION_UP。 */
const ACTION_DOWN = 0;
const ACTION_UP = 1;
const LONG_PRESS_PREFIX = "long";

/**
 * react-native-tvos は既定で、キーを離したときと、長押しの間に一定間隔で送る `longDown` などだけを JS に渡す。
 * 押しっぱなしの連打で配信を次々に立ち上げないよう、長押しは無視する。
 */
export const remoteKeyUp = (event: TVRemoteEvent): string | null =>
	Number(event.eventKeyAction) === ACTION_UP && !event.eventType.startsWith(LONG_PRESS_PREFIX)
		? event.eventType
		: null;

/** 押し続けると動き続けてほしい操作に使う。長押しの `longDown` は `down` として返す。 */
export const remoteKeyRepeating = (event: TVRemoteEvent): string | null => {
	const action = Number(event.eventKeyAction);
	if (!event.eventType.startsWith(LONG_PRESS_PREFIX)) {
		return action === ACTION_UP ? event.eventType : null;
	}
	// 長押しを終えたときの ACTION_UP も long 付きで届くので、そこで1つ余計に動かさない。
	if (action !== ACTION_DOWN) {
		return null;
	}
	const key = event.eventType.slice(LONG_PRESS_PREFIX.length);
	return key.charAt(0).toLowerCase() + key.slice(1);
};
