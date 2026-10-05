const fs = require("fs");
const path = require("path");
const { mapPath } = require("./reorg-map.cjs");

const SRC = path.join(__dirname, "..", "src");
const CODE_EXT = new Set([".ts", ".tsx", ".js", ".jsx"]);

function walk(dir, base = dir, out = []) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			walk(full, base, out);
		} else {
			out.push(path.relative(base, full).split(path.sep).join("/"));
		}
	}
	return out;
}

const allFiles = walk(SRC);
const fileMap = {};
const unmapped = [];

for (const rel of allFiles) {
	const newRel = mapPath(rel);
	if (newRel === null) {
		unmapped.push(rel);
		fileMap[rel] = rel;
	} else {
		fileMap[rel] = newRel;
	}
}

if (unmapped.length) {
	console.error("UNMAPPED FILES (left in place, review manually):");
	unmapped.forEach((f) => console.error("  " + f));
}

function stripExt(p) {
	const ext = path.posix.extname(p);
	return CODE_EXT.has(ext) ? p.slice(0, -ext.length) : p;
}

const noExtToOld = {};
for (const rel of allFiles) {
	noExtToOld[stripExt(rel)] = rel;
	noExtToOld[rel] = rel;
}

function resolveSpecifier(fromFileOldRel, specifier) {
	const fromDir = path.posix.dirname(fromFileOldRel);
	const joined = path.posix.normalize(path.posix.join(fromDir, specifier));

	const candidates = [
		joined,
		joined + ".ts",
		joined + ".tsx",
		joined + ".js",
		joined + ".jsx",
		joined + ".css",
		joined + "/index.ts",
		joined + "/index.tsx",
	];
	for (const c of candidates) {
		if (noExtToOld[c]) return noExtToOld[c];
	}
	return null;
}

const IMPORT_EXT_STRIPPABLE = new Set([".ts", ".tsx", ".js", ".jsx"]);

function toAliasSpecifier(newRel) {
	const ext = path.posix.extname(newRel);
	const withoutExt = IMPORT_EXT_STRIPPABLE.has(ext) ? newRel.slice(0, -ext.length) : newRel;
	return "@/" + withoutExt;
}

let totalRewrites = 0;
const rewriteLog = [];

function rewriteContent(oldRel, content) {
	let rewrites = 0;

	function replacer(_match, prefix, quote, spec, suffix) {
		if (!spec.startsWith(".")) return _match;
		const resolvedOld = resolveSpecifier(oldRel, spec);
		if (!resolvedOld) return _match;
		const newTargetRel = fileMap[resolvedOld];
		const newImporterRel = fileMap[oldRel];

		const sameNewDir =
			path.posix.dirname(newImporterRel) === path.posix.dirname(newTargetRel);
		const isSimpleSibling = /^\.\/[^/]+$/.test(spec);
		if (sameNewDir && isSimpleSibling) {
			return _match;
		}

		const aliasSpec = toAliasSpecifier(newTargetRel);
		rewrites++;
		return `${prefix}${quote}${aliasSpec}${quote}${suffix}`;
	}

	content = content.replace(
		/(from\s*)(["'])(\.[^"']+)\2()/g,
		(m, p1, q, spec) => replacer(m, p1, q, spec, "")
	);
	content = content.replace(
		/(import\s*)(["'])(\.[^"']+)\2()/g,
		(m, p1, q, spec) => replacer(m, p1, q, spec, "")
	);
	content = content.replace(
		/(import\()(["'])(\.[^"']+)\2(\))/g,
		(m, p1, q, spec, p4) => replacer(m, p1, q, spec, p4)
	);

	totalRewrites += rewrites;
	if (rewrites > 0) rewriteLog.push(`${oldRel}  (${rewrites} import${rewrites > 1 ? "s" : ""} rewritten)`);
	return content;
}

const buffers = {};
for (const rel of allFiles) {
	const abs = path.join(SRC, rel);
	const ext = path.posix.extname(rel);
	if (CODE_EXT.has(ext)) {
		const content = fs.readFileSync(abs, "utf8");
		buffers[fileMap[rel]] = rewriteContent(rel, content);
	} else {
		buffers[fileMap[rel]] = fs.readFileSync(abs);
	}
}

for (const [newRel, content] of Object.entries(buffers)) {
	const abs = path.join(SRC, newRel);
	fs.mkdirSync(path.dirname(abs), { recursive: true });
	fs.writeFileSync(abs, content);
}

for (const rel of allFiles) {
	if (fileMap[rel] !== rel) {
		const abs = path.join(SRC, rel);
		if (fs.existsSync(abs)) fs.unlinkSync(abs);
	}
}

function pruneEmptyDirs(dir) {
	if (!fs.existsSync(dir)) return;
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		if (entry.isDirectory()) pruneEmptyDirs(path.join(dir, entry.name));
	}
	if (fs.readdirSync(dir).length === 0 && dir !== SRC) {
		fs.rmdirSync(dir);
	}
}
pruneEmptyDirs(SRC);

if (unmapped.length) {
	console.log(`${unmapped.length} file(s) left in place (unmapped) - see above.`);
}

fs.writeFileSync(
	path.join(__dirname, "reorg-report.txt"),
	[
		`Files processed: ${allFiles.length}`,
		`Imports rewritten: ${totalRewrites}`,
		"",
		"--- Per-file rewrite log ---",
		...rewriteLog,
		"",
		"--- Unmapped files (left in place) ---",
		...unmapped,
	].join("\n")
);