/** react-native-tvos は View の実体に requestTVFocus を足すが、型定義には無い。 */
type TVFocusable = { requestTVFocus: () => void };

const isTVFocusable = (element: object): element is TVFocusable =>
	"requestTVFocus" in element && typeof element.requestTVFocus === "function";

export const requestTVFocus = (element: object | null) => {
	if (element != null && isTVFocusable(element)) {
		element.requestTVFocus();
	}
};
