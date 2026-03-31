
export interface Node {
	FullName : string, // n.n.Alias
	Aliases : string[],


	getAliases(): string[];
}


