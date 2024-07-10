import path from "path";
import fs from "fs/promises";
import mustache from "mustache";
import chalk from "chalk";
import * as p from "@clack/prompts";
import { readDir } from "../utils/read-dir.js";
import { kebabify } from "../utils/kebabify.js";
import { dirInsideGitRepo, createGitRepo } from "../utils/git.js";
import { installDependencies } from "../utils/install-dependencies.js";
import { PKG_ROOT } from "../constants.js";
import type { PromptData } from "./prompt.js";

const templateFileExtension = ".mustache";
const templateDir = path.resolve(PKG_ROOT, "template");

export async function generate(promptData: PromptData) {
	const flags = promptData.flags;

	let libName;
	let libNameKebab;
	let libDir;

	if (libName === ".") {
		libName = path.basename(process.cwd());
		libNameKebab = kebabify(libName);
		libDir = process.cwd();
	} else {
		libName = path.basename(promptData.name);
		libNameKebab = kebabify(libName);
		libDir = path.join(process.cwd(), promptData.name.replace(libName, libNameKebab));
	}

	const templateData = {
		...promptData,
		name: libName,
		name_kebab: libNameKebab,
		year: new Date().getFullYear(),
	};

	// read all files in the template directoy
	const templateFiles = await readDir(templateDir);

	// copy all files to the lib directory
	for (const file of templateFiles) {
		const dest = file.replace(templateDir, libDir);
		const destDir = path.parse(dest).dir;

		await fs.mkdir(destDir, { recursive: true });

		// if the file is a template, render it and copy it
		if (file.endsWith(templateFileExtension)) {
			const template = await fs.readFile(file, "utf8");
			const content = mustache.render(template, templateData);

			// write the file without the template extension
			await fs.writeFile(dest.replace(templateFileExtension, ""), content);
		} else if (file.endsWith("package.json")) {
			// no need to use mustache for package.json
			// we will take advantage of the standard JSON parser and serializer.
			const pkg = JSON.parse(await fs.readFile(file, "utf8"));

			pkg.name = templateData.name_kebab;

			pkg.description = templateData.description;

			pkg.keywords = templateData.keywords;

			pkg.author = {
				name: templateData.author_name,
				email: templateData.author_email,
			};

			await fs.writeFile(dest, JSON.stringify(pkg, null, 4));
		} else {
			await fs.copyFile(file, dest);
		}
	}

	// create git repo
	if (flags.init_git_repo) {
		const s = p.spinner();

		s.start("Creating git repo");

		const insideGitRepo = await dirInsideGitRepo(libDir);

		if (insideGitRepo) {
			console.log(chalk.yellow(`${promptData.name} is already inside a git repo, skipping`));
		} else {
			try {
				await createGitRepo(libDir);

				s.stop("Git repo created");
			} catch {
				console.log(chalk.red(`Failed to create git repo, skipping`));

				s.stop();
			}
		}
	}

	// install dependencies
	if (flags.install_dependencies) {
		const s = p.spinner();

		s.start("Installing dependencies");

		try {
			await installDependencies(libDir);
		} catch {
			console.log(chalk.red("Failed to install dependencies, skipping"));
		}

		s.stop("Installed dependencies");
	}

	return {
		name: libName,
		relativeDir: path.relative(process.cwd(), libDir),
	};
}
