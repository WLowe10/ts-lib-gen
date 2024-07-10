#!/usr/bin/env node

import * as p from "@clack/prompts";
import { prompt } from "./prompt.js";
import { generate } from "./generate.js";

p.intro("create-ts-lib");

const promptData = await prompt();
const result = await generate(promptData);

// your app lib has been created!
p.outro("");
