import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDir, "..");
const outDir = join(root, "itch-build");
const buildId = createBuildId();
const args = process.argv.slice(2);

const options = parseArgs(args);
const butler = process.env.BUTLER_PATH || findButler();

if (options.version) {
  runButler(["version"]);
  process.exit(0);
}

if (options.login) {
  runButler(["login"]);
  process.exit(0);
}

const target = options.target || process.env.ITCH_TARGET || "";
const channel = options.channel || process.env.ITCH_CHANNEL || "html5";

if (!target) {
  printUsage();
  process.exit(1);
}

prepareUploadFolder();
applyCacheBusting();
validateUploadFolder();

const pushTarget = `${target}:${channel}`;
console.log(`Prepared ${outDir}`);
console.log(`Build id: ${buildId}`);
console.log(`Deploy target: ${pushTarget}`);

if (options.dryRun) {
  console.log("Dry run only. Skipping butler push.");
  process.exit(0);
}

runButler(["push", outDir, pushTarget]);

function parseArgs(rawArgs) {
  const parsed = {
    channel: "",
    dryRun: false,
    login: false,
    target: "",
    version: false,
  };

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];

    if (arg === "--dry-run") {
      parsed.dryRun = true;
    } else if (arg === "--login") {
      parsed.login = true;
    } else if (arg === "--version") {
      parsed.version = true;
    } else if (arg === "--channel" || arg === "-c") {
      parsed.channel = rawArgs[index + 1] || "";
      index += 1;
    } else if (arg.startsWith("--channel=")) {
      parsed.channel = arg.slice("--channel=".length);
    } else if (arg === "--target" || arg === "-t") {
      parsed.target = rawArgs[index + 1] || "";
      index += 1;
    } else if (arg.startsWith("--target=")) {
      parsed.target = arg.slice("--target=".length);
    } else if (!arg.startsWith("-") && !parsed.target) {
      parsed.target = arg;
    }
  }

  return parsed;
}

function findButler() {
  const candidates = [
    join(root, "butler.exe"),
    join(root, "..", "reward-link", "butler.exe"),
    join(root, "..", "feedback-loop", "butler.exe"),
    join(root, "..", "feedback-system", "butler.exe"),
    join(root, "..", "compliance-research", "butler.exe"),
  ];

  return candidates.find((candidate) => existsSync(candidate)) || "butler";
}

function prepareUploadFolder() {
  assertInsideRoot(outDir);

  if (existsSync(outDir)) {
    rmSync(outDir, { force: true, recursive: true });
  }

  mkdirSync(outDir, { recursive: true });
  copyRequired("index.html");
  copyRequired("src");
  copyOptional("assets");
  copyOptional("vendor");
}

function copyRequired(relativePath) {
  const source = join(root, relativePath);
  const destination = join(outDir, relativePath);

  if (!existsSync(source)) {
    throw new Error(`Missing required deploy file: ${source}`);
  }

  cpSync(source, destination, { recursive: true });
}

function copyOptional(relativePath) {
  const source = join(root, relativePath);
  const destination = join(outDir, relativePath);

  if (existsSync(source)) {
    cpSync(source, destination, { recursive: true });
  }
}

function applyCacheBusting() {
  bustHtmlFile(join(outDir, "index.html"));
  bustJavaScriptTree(join(outDir, "src"));
}

function validateUploadFolder() {
  const checks = [
    {
      file: join(outDir, "index.html"),
      label: "HTML entry",
      pattern: /src\/index\.js\?v=\d+/,
    },
    {
      file: join(outDir, "src", "index.js"),
      label: "module entry",
      pattern: /session\/app\.js\?v=\d+/,
    },
    {
      file: join(outDir, "src", "style.css"),
      label: "stylesheet",
      pattern: /study-page/,
    },
  ];

  for (const check of checks) {
    if (!existsSync(check.file)) {
      throw new Error(`Deploy validation failed: missing ${check.file}`);
    }

    const contents = readFileSync(check.file, "utf8");
    if (!check.pattern.test(contents)) {
      throw new Error(`Deploy validation failed: ${check.label} was not packaged correctly`);
    }
  }
}

function bustHtmlFile(filePath) {
  const original = readFileSync(filePath, "utf8");
  const updated = original.replace(
    /(src|href)="((?:\.\/)?(?:src|assets|vendor)\/[^"#?]+)"/g,
    `$1="$2?v=${buildId}"`,
  );

  writeFileSync(filePath, updated);
}

function bustJavaScriptTree(directory) {
  if (!existsSync(directory)) return;

  const entries = readdirSync(directory, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      if (entry.name !== "lib") {
        bustJavaScriptTree(fullPath);
      }
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      bustJavaScriptFile(fullPath);
    }
  }
}

function bustJavaScriptFile(filePath) {
  const original = readFileSync(filePath, "utf8");
  const staticImportPattern =
    /((?:import|export)\s+(?:[^"']+?\s+from\s+)?["'])(\.{1,2}\/[^"']+\.js)(["'])/g;
  const dynamicImportPattern = /(import\(\s*["'])(\.{1,2}\/[^"']+\.js)(["']\s*\))/g;
  const updated = original
    .replace(staticImportPattern, `$1$2?v=${buildId}$3`)
    .replace(dynamicImportPattern, `$1$2?v=${buildId}$3`);

  if (updated !== original) {
    writeFileSync(filePath, updated);
  }
}

function createBuildId() {
  const now = new Date();
  return [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    String(now.getUTCDate()).padStart(2, "0"),
    String(now.getUTCHours()).padStart(2, "0"),
    String(now.getUTCMinutes()).padStart(2, "0"),
    String(now.getUTCSeconds()).padStart(2, "0"),
  ].join("");
}

function runButler(butlerArgs) {
  const result = spawnSync(butler, butlerArgs, {
    cwd: root,
    shell: false,
    stdio: "inherit",
  });

  if (result.error) {
    if (result.error.code === "ENOENT") {
      console.error("");
      console.error("Could not find butler.");
      console.error("Install butler, put butler.exe in this repo root, or set:");
      console.error("  BUTLER_PATH=C:\\path\\to\\butler.exe");
      console.error("");
    }

    throw result.error;
  }

  process.exit(result.status ?? 1);
}

function assertInsideRoot(pathToCheck) {
  const resolved = resolve(pathToCheck);
  const rootWithSep = root.endsWith(sep) ? root : `${root}${sep}`;

  if (!resolved.startsWith(rootWithSep)) {
    throw new Error(`Refusing to write outside repository: ${resolved}`);
  }
}

function printUsage() {
  console.log("Usage:");
  console.log("  npm run itch:login");
  console.log("  npm run itch:version");
  console.log("  npm run deploy");
  console.log("  npm run deploy -- yourname/project-slug");
  console.log("  npm run deploy -- --target yourname/project-slug --channel html5");
  console.log("  npm run deploy:dry");
  console.log("  npm run deploy:dry -- yourname/project-slug");
  console.log("");
  console.log("Environment alternatives:");
  console.log("  ITCH_TARGET=yourname/project-slug");
  console.log("  ITCH_CHANNEL=html5");
  console.log("  BUTLER_PATH=C:\\path\\to\\butler.exe");
}
