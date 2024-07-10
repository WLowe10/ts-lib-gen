import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const distPath = path.dirname(__filename);

// tsup bundles the code into a single file, so we will use this path as a reference to the index.js file in ./dist
export const PKG_ROOT = path.join(distPath, "../");
