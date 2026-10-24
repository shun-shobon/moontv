import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "moontv.serverUrl";

export const loadServerUrl = async (): Promise<string | null> =>
	await AsyncStorage.getItem(STORAGE_KEY);

export const saveServerUrl = async (url: string): Promise<void> => {
	await AsyncStorage.setItem(STORAGE_KEY, url);
};

export const clearServerUrl = async (): Promise<void> => {
	await AsyncStorage.removeItem(STORAGE_KEY);
};
