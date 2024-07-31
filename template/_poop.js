import * as utils from "poopgen/utils";
import * as p from "@clack/prompts";
import fs from "fs";
import path from "path";
import chalk from "chalk";

/** @type{import("poopgen").BeforeFn}  */
export async function before(ctx) {
	p.intro("ts-lib-gen");

	const nodePackageManager = utils.getNodePackageManager();

	const result = await p.group(
		{
			name: () =>
				p.text({
					message: "What do you want to name your lib?",
					validate: (value) => {
						if (value.trim().length === 0) {
							return "Name is required";
						}
					},
				}),
			description: () =>
				p.text({
					message: "Enter description",
				}),
			keywords_csv: () =>
				p.text({
					message: "Enter keywords (separated by comma)",
				}),
			version: () =>
				p.text({
					message: "Version",
					defaultValue: "1.0.0",
					placeholder: "1.0.0",
				}),
			author_name: () =>
				p.text({
					message: "What is your name?",
				}),
			author_email: () =>
				p.text({
					message: "What is your email?",
				}),
		},
		{
			onCancel: () => {
				p.cancel("cancelled");
				process.exit(0);
			},
		}
	);

	// const { dir, name, packageName } = utils.parseProjectName(result.name, ctx);
	const { dir, name, packageName } = utils.parseProjectName(result.name, ctx);

	const keywords = typeof result.keywords_csv === "string" ? result.keywords_csv.split(",") : [];

	// set the destination directory
	ctx.destPath = dir;

	ctx.data.lib = {
		name: name,
		package_name: packageName,
		keywords: keywords,
		description: result.description,
		version: result.version,
		author: {
			name: result.author_name,
			email: result.author_email,
		},
	};

	ctx.data.node_package_manager = nodePackageManager;
}

/** @type{import("poopgen").AfterFn}  */
export async function after(ctx) {
	const data = ctx.data;
	const packageManager = ctx.data.node_package_manager;

	const result = await p.group(
		{
			should_init_git: () =>
				p.confirm({
					message: "Initialize Git repo?",
				}),
			should_install_deps: () =>
				p.confirm({
					message: `Install dependencies with ${packageManager}?`,
				}),
		},
		{
			onCancel: () => {
				p.cancel("cancelled");
				process.exit(0);
			},
		}
	);

	// init a git repo in the destination
	if (result.should_init_git) {
		await initGit(ctx.destPath);
	}

	// // install node modules with user's package manager in the destination
	if (result.should_install_deps) {
		const spinner = p.spinner();

		try {
			spinner.start("Installing dependencies...");

			await utils.installNodeModules(packageManager, {
				cwd: ctx.destPath,
			});

			spinner.stop("Successfully installed dependencies");
		} catch {
			spinner.stop("Failed to install dependencies, skipping");
		}
	}

	if (process.cwd() !== ctx.destPath) {
		p.note(`cd ${path.relative(process.cwd(), ctx.destPath)}`, "Next steps");
	}
}

// --- helpers ---

/**
 * @param {string} dest
 */
async function initGit(dest) {
	const spinner = p.spinner();

	try {
		spinner.start("Initializing git repository...");

		// const destHasGitRepo = utils.dirHasGitRepo(dest);
		// const dirIsInsideGitRepo = await utils.dirIsInsideGitRepo(dest);

		// if (destHasGitRepo) {
		// 	spinner.stop();

		// 	const should_overwrite_git = await p.confirm({
		// 		message: `${chalk.redBright("Warning:")} There is already a git repository. Initializing a new repository would delete the previous history. Would you like to continue?`,
		// 		initialValue: false,
		// 	});

		// 	if (!should_overwrite_git) {
		// 		spinner.message("Skipping git initialization.");

		// 		return;
		// 	}

		// 	fs.rmSync(path.join(dest, ".git"));
		// } else if (dirIsInsideGitRepo) {
		// }

		await utils.initGit({
			cwd: dest,
		});

		spinner.stop("Successfully intialized git repository");
	} catch {
		spinner.stop("Failed to initialize git repository, skipping");
	}

	spinner.stop();
}
