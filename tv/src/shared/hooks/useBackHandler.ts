import { useEffect } from "react";
import { BackHandler } from "react-native";

/** 戻るキーでアプリを閉じず、画面ごとの戻り先へ移す。null のあいだは他の画面に任せる。 */
export const useBackHandler = (onBack: (() => void) | null) => {
	useEffect(() => {
		const subscription =
			onBack == null
				? null
				: BackHandler.addEventListener("hardwareBackPress", () => {
						onBack();
						return true;
					});
		return () => {
			subscription?.remove();
		};
	}, [onBack]);
};
