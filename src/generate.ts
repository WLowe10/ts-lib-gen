import path from "path";
import fs from "fs/promises";
import mustache from "mustache";
import * as p from "@clack/prompts";
import { readDir } from "./utils/read-dir.js";
import { kebabify } from "./utils/kebabify.js";
import { dirInsideGitRepo, createGitRepo } from "./utils/git.js";
import { logger } from "./utils/logger.js";
import { installDependencies } from "./utils/install-dependencies.js";
import type { PromptData } from "./prompt.js";

const templateFileExtension = ".mustache";
const templateDir = path.resolve(import.meta.dirname, "../template");

export async function generate(promptData: PromptData) {
	const flags = promptData.flags;

	let libName = promptData.name;
	let libNameKebab;
	let libDir;

	if (libName === ".") {
		libName = path.basename(process.cwd());
		libNameKebab = kebabify(libName);
		libDir = process.cwd();
	} else {
		libNameKebab = kebabify(libName);
		libDir = path.join(process.cwd(), libNameKebab);
	}

	const data = {
		...promptData,
		name: libName,
		name_kebab: libNameKebab,
		year: new Date().getFullYear(),
	};

	// read all files in the template directoy
	const templateFiles = await readDir(path.join(templateDir));

	for (const file of templateFiles) {
		const dest = file.replace(templateDir, libDir);
		const destDir = path.parse(dest).dir;

		await fs.mkdir(destDir, { recursive: true });

		if (file.endsWith(templateFileExtension)) {
			const template = await fs.readFile(file, "utf8");
			const content = mustache.render(template, data);

			// write the file without the template extension
			await fs.writeFile(dest.replace(templateFileExtension, ""), content);
		} else if (file.endsWith("package.json")) {
			const pkg = JSON.parse(await fs.readFile(file, "utf8"));

			pkg.name = data.name_kebab;

			pkg.description = data.description;

			pkg.keywords = data.keywords;

			pkg.author = {
				name: data.author_name,
				emai: data.author_email,
			};

			await fs.writeFile(dest, JSON.stringify(pkg, null, 4));
		} else {
			await fs.copyFile(file, dest);
		}
	}

	const s = p.spinner();

	// create git repo
	if (flags.init_git_repo) {
		s.start("Creating git repo");

		const insideGitRepo = await dirInsideGitRepo(libDir);

		if (insideGitRepo) {
			logger.warn(`${promptData.name} is already inside a git repo, skipping`);
		} else {
			try {
				await createGitRepo(libDir);
			} catch {
				logger.error(`Failed to create git repo, skipping`);
			}
		}

		s.stop();
	}

	// install dependencies
	if (flags.install_dependencies) {
		s.start("Installing dependencies");

		try {
			await installDependencies(libDir);
		} catch {
			logger.error("Failed to install dependencies, skipping");
		}

		s.stop();
	}
}
