function getFirstLetter(origin: string): string | null {
	// [a-zA-Zа-яА-ЯёЁ] — ищет одну букву (латиница + кириллица)
	// i — флаг (необязателен, так как в диапазоне уже есть А-Я)
	const match = origin.match(/[a-zа-яё]/i);
	return match ? match[0] : null;
}
