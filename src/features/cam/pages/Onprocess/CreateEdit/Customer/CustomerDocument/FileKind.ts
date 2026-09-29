export type FileKind = "image" | "pdf" | "other";

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp"]);

export function getFileKind(filename: string): FileKind {
	const ext = filename.split(".").pop()?.toLowerCase() ?? "";
	if (ext === "pdf") return "pdf";
	if (IMAGE_EXTENSIONS.has(ext)) return "image";

	return "other";
}