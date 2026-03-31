
export function shiftEnumValue<T extends Record<string | number, string | number>>(
	enumObj: T,
	current: number,
	delta: number
): number {
	const nextValue = current + delta;

	if (enumObj[nextValue] !== undefined) {
		return nextValue;
	}

	return current;
}
