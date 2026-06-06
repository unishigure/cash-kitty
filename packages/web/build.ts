/**
 * Static-site build for the Cash Kitty web app.
 *
 * Produces a fully static `dist/` (HTML + hashed JS/CSS + PWA assets) that can
 * be hosted on any static host (Cloudflare Pages / Netlify / Vercel) served at
 * the site root.
 *
 * Unlike `bun start`, there is NO server here: the OCR proxy (`/api/ocr/*`) and
 * the runtime config endpoint (`/api/config`) do not exist. The config the
 * server used to provide is instead baked into the bundle at build time from
 * `BUN_PUBLIC_*` env vars (see `.env.example`):
 *   - BUN_PUBLIC_GOOGLE_CLIENT_ID — Google OAuth web client id (Drive).
 *   - BUN_PUBLIC_OCR_API_URL      — OCR API base URL the SPA calls directly
 *                                   (e.g. a Cloudflare Tunnel fronting the local
 *                                   API). OCR works only while that endpoint is
 *                                   reachable, so it is effectively local-only.
 */
import { cp, rm } from "node:fs/promises";
import { join } from "node:path";
import tailwind from "bun-plugin-tailwind";

const root = import.meta.dir;
const outdir = join(root, "dist");

// Start from a clean output directory so stale hashed assets don't linger.
await rm(outdir, { recursive: true, force: true });

const result = await Bun.build({
	entrypoints: [join(root, "src/index.html")],
	outdir,
	target: "browser",
	minify: true,
	sourcemap: "linked",
	plugins: [tailwind],
	// Inline BUN_PUBLIC_* env vars (Google client id, OCR API URL) into the bundle.
	env: "BUN_PUBLIC_*",
	// frontend.tsx registers the service worker only in production builds.
	define: { "process.env.NODE_ENV": JSON.stringify("production") },
});

if (!result.success) {
	console.error("❌ Build failed:");
	for (const log of result.logs) console.error(log);
	process.exit(1);
}

// PWA assets (manifest, service worker, icons) are served from ../public by the
// Bun server at runtime; a static host needs them copied to the site root.
await cp(join(root, "public"), outdir, { recursive: true });

// Ensure the production HTML contains static manifest/icon links.
// Some platforms are picky about links injected only via runtime script.
const distIndexPath = join(outdir, "index.html");
const distIndex = Bun.file(distIndexPath);
if (await distIndex.exists()) {
	const html = await distIndex.text();
	const staticPwaLinks = [
		'<link rel="manifest" href="/manifest.webmanifest" />',
		'<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />',
		'<link rel="shortcut icon" type="image/png" href="/favicon-32.png" />',
		'<link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />',
		'<link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />',
		'<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />',
	].join("\n    ");

	const injectionAnchor = "<title>Cash Kitty — レシート家計簿</title>";
	const withLinks = html.includes('<link rel="manifest"')
		? html
		: html.replace(injectionAnchor, `${injectionAnchor}\n    ${staticPwaLinks}`);
	await Bun.write(distIndexPath, withLinks);
}

console.log(`✅ Built static site → ${outdir}`);
console.log(
	`   Client ID:   ${process.env.BUN_PUBLIC_GOOGLE_CLIENT_ID ? "set" : "(unset — Drive disabled)"}`,
);
console.log(
	`   OCR API URL: ${process.env.BUN_PUBLIC_OCR_API_URL || "(unset — set BUN_PUBLIC_OCR_API_URL)"}`,
);
