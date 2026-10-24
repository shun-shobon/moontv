import type { TVRemoteEvent } from "react-native";

/** Android の KeyEvent.ACTION_UP。押しっぱなしの連打で配信を次々に立ち上げないよう、離したときだけ反応する。 */
const ACTION_UP = 1;

export const remoteKeyUp = (event: TVRemoteEvent): string | null =>
	Number(event.eventKeyAction) === ACTION_UP ? event.eventType : null;
