export type Store<T> = {
	get: () => T;
	set: (value: T) => void;
	subscribe: (onChange: () => void) => () => void;
};

export const createStore = <T>(initial: T): Store<T> => {
	let value = initial;
	const listeners = new Set<() => void>();
	return {
		get: () => value,
		set: (next) => {
			value = next;
			for (const listener of listeners) {
				listener();
			}
		},
		subscribe: (onChange) => {
			listeners.add(onChange);
			return () => {
				listeners.delete(onChange);
			};
		},
	};
};
