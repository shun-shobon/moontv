import { useEffect } from "react";
import { BackHandler } from "react-native";

/** 戻るキーでアプリを閉じず、画面ごとの戻り先へ移す。 */
export const useBackHandler = (onBack: () => void) => {
	useEffect(() => {
		const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
			onBack();
			return true;
		});
		return () => {
			subscription.remove();
		};
	}, [onBack]);
};
