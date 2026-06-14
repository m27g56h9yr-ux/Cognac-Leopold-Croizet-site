import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const oldRoutes = [
  '/ru/%d0%bb%d0%b5%d0%be%d0%bf%d0%be%d0%bb%d1%8c%d0%b4%d0%b0-%d0%ba%d1%80%d1%83%d0%b0%d0%b7%d0%b5/',
  '/ru/%D0%BB%D0%B5%D0%BE%D0%BF%D0%BE%D0%BB%D1%8C%D0%B4%D0%B0-%D0%BA%D1%80%D1%83%D0%B0%D0%B7%D0%B5/',
];
const stableRoute = '/ru/leopold-croizet/';

const oldRouteDir = path.join(rootDir, 'ru', '%d0%bb%d0%b5%d0%be%d0%bf%d0%be%d0%bb%d1%8c%d0%b4%d0%b0-%d0%ba%d1%80%d1%83%d0%b0%d0%b7%d0%b5');
const stableRouteDir = path.join(rootDir, 'ru', 'leopold-croizet');
const oldRouteFile = path.join(oldRouteDir, 'index.html');
const stableRouteFile = path.join(stableRouteDir, 'index.html');

const skippedDirs = new Set(['.git', 'node_modules', 'wp-content']);
const textExtensions = new Set(['.html', '.xml', '.txt', '.json']);

function replaceOldRoutes(value) {
  return oldRoutes.reduce((next, oldRoute) => next.split(oldRoute).join(stableRoute), value);
}

async function pathExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

async function copyStableRoute() {
  if (!(await pathExists(oldRouteFile))) return false;

  const source = await readFile(oldRouteFile, 'utf8');
  await mkdir(stableRouteDir, { recursive: true });
  await writeFile(stableRouteFile, replaceOldRoutes(source));
  return true;
}

async function* walkTextFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (skippedDirs.has(entry.name)) continue;
      yield* walkTextFiles(path.join(dir, entry.name));
      continue;
    }

    if (!entry.isFile()) continue;
    if (!textExtensions.has(path.extname(entry.name))) continue;
    yield path.join(dir, entry.name);
  }
}

async function replaceReferences() {
  let changedFiles = 0;

  for await (const filePath of walkTextFiles(rootDir)) {
    const current = await readFile(filePath, 'utf8');
    const next = replaceOldRoutes(current);

    if (next === current) continue;
    await writeFile(filePath, next);
    changedFiles += 1;
  }

  return changedFiles;
}

const copiedRoute = await copyStableRoute();
const changedFiles = await replaceReferences();
await rm(oldRouteDir, { recursive: true, force: true });

console.log(
  `[seo] Russian Leopold Croizet route fixed: ${copiedRoute ? 'created' : 'existing'} ${stableRoute}, updated ${changedFiles} file(s).`,
);
