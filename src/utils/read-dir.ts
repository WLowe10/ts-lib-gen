import fs from "fs/promises";
import path from "path";

export async function readDir(dir: string): Promise<string[]> {
	const files: string[] = [];

	const entries = await fs.readdir(dir, { withFileTypes: true });

	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);

		if (entry.isDirectory()) {
			files.push(...(await readDir(fullPath)));
		} else if (entry.isFile()) {
			files.push(fullPath);
		}
	}

	return files;
}
