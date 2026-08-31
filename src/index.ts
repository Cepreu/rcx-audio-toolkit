#!/usr/bin/env bun

import { resolve } from "node:path";
import { loadEnv } from "./utils";
import { upload } from "./upload";
import { translateCsv } from "./translation";
import { generateTtsFiles } from "./tts";

function usage(): never {
  console.error("Usage:");
  console.error("  bun src/index.ts upload <working_directory> <csv_file> <account> [--auto-token]");
  console.error("  bun src/index.ts translate <input_csv> <output_csv> [--languages <code,...>]");
  console.error("  bun src/index.ts tts <input_csv> <output_directory>");
  process.exit(1);
}

async function main() {
  const [command, ...args] = Bun.argv.slice(2);

  const callerDirectory = process.cwd();
  await loadEnv(callerDirectory);

  if (command === "translate") {
    const [inputCsvArg, outputCsvArg, option, languageCodes] = args;
    if (!inputCsvArg || !outputCsvArg || (option && option !== "--languages") || (option && !languageCodes) || args.length > 4) usage();
    await translateCsv(
      resolve(callerDirectory, inputCsvArg),
      resolve(callerDirectory, outputCsvArg),
      languageCodes,
    );
    return;
  }

  if (command === "tts") {
    const [inputCsvArg, outputDirectoryArg] = args;
    if (!inputCsvArg || !outputDirectoryArg || args.length !== 2) usage();
    await generateTtsFiles(resolve(callerDirectory, inputCsvArg), resolve(callerDirectory, outputDirectoryArg));
    return;
  }

  if (command !== "upload") usage();

  const [workingDirectoryArg, csvFileArg, account, option] = args;
  if (!workingDirectoryArg || !csvFileArg || !account || (option && option !== "--auto-token")) usage();

  await upload(resolve(callerDirectory, workingDirectoryArg), resolve(callerDirectory, csvFileArg), account, option === "--auto-token");
}

try {
  await main();
} catch (error) {
  console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}