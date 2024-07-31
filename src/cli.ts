#!/usr/bin/env node

import { poopgen } from "poopgen";
import chalk from "chalk";
import path from "path";

try {
	await poopgen({
		templateDir: path.join(import.meta.dirname, "../template"),
	});
} catch (err) {
	console.log(chalk.red("An unknown error has occurred"));
	console.log(err);

	process.exit(1);
}

process.exit(0);
