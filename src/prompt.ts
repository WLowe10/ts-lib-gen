import * as p from "@clack/prompts";

export type PromptData = {
	name: string;
	description: string;
	keywords: string[];
	author_name: string;
	author_email: string;
	flags: {
		init_git_repo: boolean;
		install_dependencies: boolean;
	};
};

export async function prompt(): Promise<PromptData> {
	p.intro("create-ts-lib");

	const group = await p.group(
		{
			name: () =>
				p.text({
					message: "What do you want to name your lib?",
					validate: (val) => {
						if (val.trim().length === 0) {
							return "Name is required";
						}
					},
				}),
			description: () =>
				p.text({
					message: "Enter description",
				}),
			keywordsCsv: () =>
				p.text({
					message: "Enter keywords (separated by comma)",
				}),
			authorName: () =>
				p.text({
					message: "What is your name?",
				}),
			authorEmail: () =>
				p.text({
					message: "What is your email?",
				}),
			// --- flags ---
			shouldInitGitRepo: () =>
				p.confirm({
					message: "Init git repo?",
					initialValue: true,
				}),
			shouldInstallDependencies: () =>
				p.confirm({
					message: "Install dependencies?",
					initialValue: true,
				}),
		},
		{
			onCancel: () => {
				p.cancel("cancelled");
				process.exit(0);
			},
		}
	);

	return {
		name: group.name,
		description: group.description,
		keywords: group.keywordsCsv ? group.keywordsCsv.split(",").map((k) => k.trim()) : [],
		author_name: group.authorName,
		author_email: group.authorEmail,
		flags: {
			init_git_repo: group.shouldInitGitRepo,
			install_dependencies: group.shouldInstallDependencies,
		},
	};
}
