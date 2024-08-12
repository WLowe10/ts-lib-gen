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

	const { dir, name, packageName } = utils.parseProjectName(result.name, ctx.dir.path);

	// split the keywords separated by commas into an array of strings
	const keywords = typeof result.keywords_csv === "string" ? result.keywords_csv.split(",") : [];

	// set the destination directory
	ctx.dir.path = dir;

	ctx.data.lib = {
		name: name,
		camel_name: kebabToCamel(packageName),
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

	// --- format package.json ---

	const packageJSONEntry = /** @type {import("poopgen").FileEntry} */ (
		ctx.dir.entries.find((entry) => entry.path === "package.json")
	);

	const pkg = JSON.parse(packageJSONEntry.content);

	pkg.name = packageName;
	pkg.description = result.description;
	pkg.keywords = keywords;
	pkg.version = result.version || "1.0.0";

	pkg.author = {
		name: result.author_name,
		email: result.author_email,
	};

	packageJSONEntry.path = path.join(ctx.dir.path, "../package.json");

	packageJSONEntry.content = JSON.stringify(pkg, null, 4);
}

/** @type{import("poopgen").AfterFn}  */
export async function after(ctx) {
	const dest = ctx.dir.path;
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
		await initGit(dest);
	}

	// // install node modules with user's package manager in the destination
	if (result.should_install_deps) {
		const spinner = p.spinner();

		try {
			spinner.start("Installing dependencies...");

			await utils.installNodeModules(packageManager, {
				cwd: dest,
			});

			spinner.stop("Successfully installed dependencies");
		} catch {
			spinner.stop("Failed to install dependencies, skipping");
		}
	}

	if (process.cwd() !== dest) {
		p.note(`cd ${path.relative(process.cwd(), dest)}`, "Next steps");
	}
}

// --- helpers ---

/**
 * Converts a kebab or snake case string into camel case
 * @param {string} str
 */
const kebabToCamel = (str) =>
	str
		.toLowerCase()
		.replace(/([-_][a-z])/g, (group) => group.toUpperCase().replace("-", "").replace("_", ""));

/**
 * @param {string} destPath
 */
async function initGit(destPath) {
	const spinner = p.spinner();

	const dirName = path.parse(destPath).name;

	spinner.start("Initializing git repository...");

	try {
		const destHasGitRepo = utils.dirHasGitRepo(destPath);
		const dirIsInsideGitRepo = await utils.dirIsInsideGitRepo(destPath);

		if (destHasGitRepo) {
			spinner.stop();

			const shouldOverwriteGit = await p.confirm({
				message: `${chalk.redBright("Warning:")} There is already a git repository. Initializing a new repository would delete the previous history. Would you like to continue?`,
				initialValue: false,
			});

			if (!shouldOverwriteGit) {
				spinner.message("Skipping git initialization.");

				return;
			}

			fs.rmSync(path.join(destPath, ".git"));
		} else if (dirIsInsideGitRepo) {
			spinner.stop();

			const shouldInitChildGitRepo = await p.confirm({
				message: `${chalk.redBright.bold(
					"Warning:"
				)} "${dirName}" is already in a git worktree. Would you still like to initialize a new git repository in this directory?`,
				initialValue: false,
			});

			if (!shouldInitChildGitRepo) {
				spinner.message("Skipping git initialization");

				return;
			}
		}

		await utils.initGit({
			cwd: destPath,
		});

		spinner.stop("Successfully intialized git repository");
	} catch {
		spinner.stop("Failed to initialize git repository, skipping");
	}
}
