export function enumToArray<T extends Record<string, string | number>>(enumObj: T): T[keyof T][] {
	return Object.values(enumObj).filter(
		(value) => typeof value === 'string' || typeof value === 'number'
	) as T[keyof T][];
}
