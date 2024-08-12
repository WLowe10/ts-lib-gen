#!/usr/bin/env node

import { poopgen } from "poopgen";
import chalk from "chalk";
import path from "path";

try {
	await poopgen({
		// when testing ts-lib-gen in development, we will always gen the output to this directory that is not tracked by git.
		dest: process.env.NODE_ENV === "development" ? "./dest" : undefined,
		template: path.join(import.meta.dirname, "../template"),
	});
} catch (err) {
	console.log(chalk.red("An unknown error has occurred"));
	console.log(err);

	process.exit(1);
}

process.exit(0);
