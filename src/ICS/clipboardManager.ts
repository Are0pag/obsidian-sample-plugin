// import clipboard from 'clipboardy';
//
// export function waitForCopy(): Promise<string> {
// 	return new Promise( async (resolve) => {
// 		let lastText = await clipboard.read();
// 		const timer = setInterval(async () => {
// 			const text = await clipboard.read();
// 			if (text && text !== lastText) {
// 				clearInterval(timer);
// 				resolve(text);
// 			}
// 		}, 500);
// 	});
// }

export function waitForCopy(): Promise<string> {
	return new Promise((resolve) => {
		// Запоминаем текущее содержимое (просто текст)
		navigator.clipboard.readText().then(lastText => {
			const timer = setInterval(async () => {
				const text = await navigator.clipboard.readText();

				if (text && text !== lastText) {
					clearInterval(timer);

					// Если вам нужен именно Markdown (как при вставке),
					// нужно получить HTML и прогнать через конвертер Obsidian
					const data = await navigator.clipboard.read();
					for (const item of data) {
						if (item.types.includes('text/html')) {
							const blob = await item.getType('text/html');
							const html = await blob.text();
							// В Obsidian есть встроенный метод для конвертации HTML в MD
							// Но проще всего для начала проверить, что прилетает в text/plain
							resolve(text);
						}
					}
					resolve(text);
				}
			}, 500);
		});
	});
}

