import {App, PluginSettingTab, Setting} from "obsidian";
import LinkTypology from "./main";
import {CodeScanOptions} from "./core/codeScanOptions";

export interface MyPluginSettings {
	codeScanOptions: string;
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
	codeScanOptions: CodeScanOptions.Cs.toString(),
}

export class SampleSettingTab extends PluginSettingTab {
	plugin: LinkTypology;

	constructor(app: App, plugin: LinkTypology) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Settings #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.codeScanOptions)
				.onChange(async (value) => {
					this.plugin.settings.codeScanOptions = value;
					await this.plugin.saveSettings();
				}));
	}
}
