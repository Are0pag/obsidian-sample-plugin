import clipboard from 'clipboardy';

export function waitForCopy(): Promise<string> {
	return new Promise( async (resolve) => {
		let lastText = await clipboard.read();
		const timer = setInterval(async () => {
			const text = await clipboard.read();
			if (text && text !== lastText) {
				clearInterval(timer);
				resolve(text);
			}
		}, 500);
	});
}

