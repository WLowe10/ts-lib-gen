#!/usr/bin/env node

import * as p from "@clack/prompts";
import { prompt } from "./steps/prompt.js";
import { generate } from "./steps/generate.js";

p.intro("create-ts-lib");

// name should be able to be a path like ./test/my-lib
const promptData = await prompt();
const result = await generate(promptData);

p.outro(
	`${result.name} has been generated! \n\nNext steps: ${promptData.name !== "." ? `cd ${result.relativeDir}` : ""}`
);
