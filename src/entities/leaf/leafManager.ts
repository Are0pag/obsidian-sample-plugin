import {setupViewOnOpen} from "./noteOpen";
import {Plugin} from "obsidian";

export class LeafManager {
	public SetupViewOnOpen(plugin: Plugin) {
		setupViewOnOpen(plugin);
	}
}
