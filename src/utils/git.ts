import { execa } from "execa";

export async function dirInsideGitRepo(dir: string) {
	try {
		// if this command succeeds, we're inside a git repo
		await execa("git", ["rev-parse", "--is-inside-work-tree"], {
			cwd: dir,
			stdout: "ignore",
		});
		return true;
	} catch {
		// otherwise it will throw a git-error and we return false
		return false;
	}
}

export async function createGitRepo(dir: string) {
	await execa("git", ["init"], {
		cwd: dir,
	});
}
