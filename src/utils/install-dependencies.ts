import { execa } from "execa";

export async function installDependencies(dir: string) {
	await execa("pnpm", ["i"], {
		cwd: dir,
	});
}
