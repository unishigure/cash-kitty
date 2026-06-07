/**
 * Generate iOS `apple-touch-startup-image` (PWA launch / splash) PNGs.
 *
 * iOS shows a BLANK WHITE screen while a home-screen PWA boots unless a startup
 * image whose pixel dimensions EXACTLY match the device (selected via a `media`
 * query) is provided. There is no fallback to `background_color`, so without
 * these the app flashes white on every cold launch.
 *
 * This script composites the app icon (public/icon-512.png) onto the manifest
 * `background_color` at every supported device resolution and writes:
 *   - public/splash/splash-<w>x<h>@<dpr>x.png  — one PNG per device (portrait)
 *   - public/splash/links.json                 — [{ media, href }] for build.ts
 *
 * Only PORTRAIT sizes are generated: the manifest locks `orientation: portrait`,
 * so iOS never needs a landscape launch image.
 *
 * No native image deps (sharp/canvas) are available, so PNG decode/encode is
 * done by hand here. Only the formats the source icon actually uses are
 * supported: 8-bit RGBA (color type 6), non-interlaced.
 *
 * Run with:  bun run splash   (see package.json)
 */

import { join } from "node:path";
import { deflateSync, inflateSync } from "node:zlib";

const root = join(import.meta.dir, "..");
const SOURCE_ICON = join(root, "public", "icon-512.png");
const OUT_DIR = join(root, "public", "splash");

// manifest background_color (#007f18) — keep in sync with manifest.webmanifest.
const BG = { r: 0x00, g: 0x7f, b: 0x18 };

// Logo occupies this fraction of the shorter screen edge.
const LOGO_SCALE = 0.4;

/**
 * Supported iOS devices, portrait CSS logical size + device-pixel-ratio.
 * Pixel dimensions of the generated PNG are width*dpr × height*dpr.
 */
const DEVICES: ReadonlyArray<{
	w: number;
	h: number;
	dpr: number;
	note: string;
}> = [
	{ w: 320, h: 568, dpr: 2, note: "iPhone SE (1st gen), 5/5s/5c" },
	{ w: 375, h: 667, dpr: 2, note: "iPhone SE (2nd/3rd), 8/7/6s/6" },
	{ w: 414, h: 736, dpr: 3, note: "iPhone 8/7/6s/6 Plus" },
	{ w: 375, h: 812, dpr: 3, note: "iPhone X/XS, 11 Pro, 12/13 mini" },
	{ w: 414, h: 896, dpr: 2, note: "iPhone XR, 11" },
	{ w: 414, h: 896, dpr: 3, note: "iPhone XS Max, 11 Pro Max" },
	{ w: 390, h: 844, dpr: 3, note: "iPhone 12/12 Pro, 13/13 Pro, 14" },
	{ w: 393, h: 852, dpr: 3, note: "iPhone 14 Pro, 15/15 Pro, 16" },
	{ w: 428, h: 926, dpr: 3, note: "iPhone 12/13 Pro Max, 14 Plus" },
	{
		w: 430,
		h: 932,
		dpr: 3,
		note: "iPhone 14 Pro Max, 15 Plus, 15 Pro Max, 16 Plus",
	},
	{ w: 402, h: 874, dpr: 3, note: "iPhone 16 Pro" },
	{ w: 440, h: 956, dpr: 3, note: "iPhone 16 Pro Max" },
	{ w: 744, h: 1133, dpr: 2, note: "iPad mini (6th gen)" },
	{ w: 768, h: 1024, dpr: 2, note: "iPad mini/Air (older), iPad 9.7" },
	{ w: 810, h: 1080, dpr: 2, note: "iPad 10.2" },
	{ w: 820, h: 1180, dpr: 2, note: "iPad Air 10.9, iPad 10.9" },
	{ w: 834, h: 1112, dpr: 2, note: "iPad Pro 10.5, Air 10.5" },
	{ w: 834, h: 1194, dpr: 2, note: "iPad Pro 11" },
	{ w: 1024, h: 1366, dpr: 2, note: "iPad Pro 12.9" },
];

interface Image {
	width: number;
	height: number;
	/** RGBA, row-major, 4 bytes/pixel. */
	data: Uint8Array;
}

const PNG_SIG = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);

// --- CRC32 (PNG chunk checksum) ----------------------------------------------
const CRC_TABLE = (() => {
	const t = new Uint32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		t[n] = c >>> 0;
	}
	return t;
})();

function crc32(bytes: Uint8Array): number {
	let c = 0xffffffff;
	for (let i = 0; i < bytes.length; i++)
		c = (CRC_TABLE[(c ^ (bytes[i] ?? 0)) & 0xff] ?? 0) ^ (c >>> 8);
	return (c ^ 0xffffffff) >>> 0;
}

// --- PNG decode (8-bit RGBA, non-interlaced only) ----------------------------
function decodePng(buf: Uint8Array): Image {
	for (let i = 0; i < 8; i++)
		if (buf[i] !== PNG_SIG[i]) throw new Error("not a PNG");

	const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
	let off = 8;
	let width = 0;
	let height = 0;
	const idat: Uint8Array[] = [];

	while (off < buf.length) {
		const len = view.getUint32(off);
		const type = String.fromCharCode(
			buf[off + 4] ?? 0,
			buf[off + 5] ?? 0,
			buf[off + 6] ?? 0,
			buf[off + 7] ?? 0,
		);
		const dataStart = off + 8;
		if (type === "IHDR") {
			width = view.getUint32(dataStart);
			height = view.getUint32(dataStart + 4);
			const bitDepth = buf[dataStart + 8];
			const colorType = buf[dataStart + 9];
			const interlace = buf[dataStart + 12];
			if (bitDepth !== 8 || colorType !== 6 || interlace !== 0)
				throw new Error(
					`unsupported PNG (bitDepth=${bitDepth} colorType=${colorType} interlace=${interlace}); only 8-bit RGBA non-interlaced is supported`,
				);
		} else if (type === "IDAT") {
			idat.push(buf.subarray(dataStart, dataStart + len));
		} else if (type === "IEND") {
			break;
		}
		off = dataStart + len + 4; // skip data + CRC
	}

	const raw = new Uint8Array(
		inflateSync(Buffer.concat(idat.map((c) => Buffer.from(c)))),
	);
	const bpp = 4;
	const stride = width * bpp;
	const out = new Uint8Array(width * height * bpp);

	// Reverse the per-scanline filter (PNG filter types 0–4).
	let pos = 0;
	for (let y = 0; y < height; y++) {
		const filter = raw[pos++] ?? 0;
		const rowStart = y * stride;
		for (let x = 0; x < stride; x++) {
			const rawByte = raw[pos++] ?? 0;
			const a = x >= bpp ? (out[rowStart + x - bpp] ?? 0) : 0; // left
			const b = y > 0 ? (out[rowStart - stride + x] ?? 0) : 0; // up
			const c = x >= bpp && y > 0 ? (out[rowStart - stride + x - bpp] ?? 0) : 0; // up-left
			let val: number;
			switch (filter) {
				case 0:
					val = rawByte;
					break;
				case 1:
					val = rawByte + a;
					break;
				case 2:
					val = rawByte + b;
					break;
				case 3:
					val = rawByte + ((a + b) >> 1);
					break;
				case 4: {
					const p = a + b - c;
					const pa = Math.abs(p - a);
					const pb = Math.abs(p - b);
					const pc = Math.abs(p - c);
					val = rawByte + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
					break;
				}
				default:
					throw new Error(`unknown PNG filter ${filter}`);
			}
			out[rowStart + x] = val & 0xff;
		}
	}

	return { width, height, data: out };
}

// --- PNG encode (8-bit RGBA, filter 0) ---------------------------------------
function encodePng(img: Image): Uint8Array {
	const { width, height, data } = img;
	const stride = width * 4;
	// Prepend filter byte 0 (None) to each scanline.
	const raw = new Uint8Array((stride + 1) * height);
	for (let y = 0; y < height; y++) {
		raw[y * (stride + 1)] = 0;
		raw.set(
			data.subarray(y * stride, y * stride + stride),
			y * (stride + 1) + 1,
		);
	}
	const compressed = new Uint8Array(
		deflateSync(Buffer.from(raw), { level: 9 }),
	);

	const chunk = (type: string, payload: Uint8Array): Uint8Array => {
		const typeBytes = Uint8Array.from([...type].map((ch) => ch.charCodeAt(0)));
		const body = new Uint8Array(typeBytes.length + payload.length);
		body.set(typeBytes, 0);
		body.set(payload, typeBytes.length);
		const out = new Uint8Array(4 + body.length + 4);
		const dv = new DataView(out.buffer);
		dv.setUint32(0, payload.length);
		out.set(body, 4);
		dv.setUint32(4 + body.length, crc32(body));
		return out;
	};

	const ihdr = new Uint8Array(13);
	const idv = new DataView(ihdr.buffer);
	idv.setUint32(0, width);
	idv.setUint32(4, height);
	ihdr[8] = 8; // bit depth
	ihdr[9] = 6; // color type RGBA
	// ihdr[10..12] = 0 (compression, filter, interlace)

	const parts = [
		PNG_SIG,
		chunk("IHDR", ihdr),
		chunk("IDAT", compressed),
		chunk("IEND", new Uint8Array(0)),
	];
	const total = parts.reduce((n, p) => n + p.length, 0);
	const result = new Uint8Array(total);
	let o = 0;
	for (const p of parts) {
		result.set(p, o);
		o += p.length;
	}
	return result;
}

// --- Bilinear resize ---------------------------------------------------------
function resize(src: Image, dw: number, dh: number): Image {
	const out = new Uint8Array(dw * dh * 4);
	const xRatio = src.width / dw;
	const yRatio = src.height / dh;
	for (let y = 0; y < dh; y++) {
		const sy = Math.min((y + 0.5) * yRatio - 0.5, src.height - 1);
		const y0 = Math.max(0, Math.floor(sy));
		const y1 = Math.min(src.height - 1, y0 + 1);
		const fy = sy - y0;
		for (let x = 0; x < dw; x++) {
			const sx = Math.min((x + 0.5) * xRatio - 0.5, src.width - 1);
			const x0 = Math.max(0, Math.floor(sx));
			const x1 = Math.min(src.width - 1, x0 + 1);
			const fx = sx - x0;
			const i00 = (y0 * src.width + x0) * 4;
			const i01 = (y0 * src.width + x1) * 4;
			const i10 = (y1 * src.width + x0) * 4;
			const i11 = (y1 * src.width + x1) * 4;
			const di = (y * dw + x) * 4;
			for (let c = 0; c < 4; c++) {
				const p00 = src.data[i00 + c] ?? 0;
				const p01 = src.data[i01 + c] ?? 0;
				const p10 = src.data[i10 + c] ?? 0;
				const p11 = src.data[i11 + c] ?? 0;
				const top = p00 * (1 - fx) + p01 * fx;
				const bot = p10 * (1 - fx) + p11 * fx;
				out[di + c] = Math.round(top * (1 - fy) + bot * fy);
			}
		}
	}
	return { width: dw, height: dh, data: out };
}

/** Solid background canvas with `logo` alpha-blended centered on top. */
function makeSplash(pw: number, ph: number, logo: Image): Image {
	const data = new Uint8Array(pw * ph * 4);
	for (let i = 0; i < pw * ph; i++) {
		data[i * 4] = BG.r;
		data[i * 4 + 1] = BG.g;
		data[i * 4 + 2] = BG.b;
		data[i * 4 + 3] = 255;
	}
	const ox = Math.floor((pw - logo.width) / 2);
	const oy = Math.floor((ph - logo.height) / 2);
	for (let y = 0; y < logo.height; y++) {
		for (let x = 0; x < logo.width; x++) {
			const si = (y * logo.width + x) * 4;
			const a = (logo.data[si + 3] ?? 0) / 255;
			if (a === 0) continue;
			const di = ((oy + y) * pw + (ox + x)) * 4;
			for (let c = 0; c < 3; c++)
				data[di + c] = Math.round(
					(logo.data[si + c] ?? 0) * a + (data[di + c] ?? 0) * (1 - a),
				);
			data[di + 3] = 255;
		}
	}
	return { width: pw, height: ph, data };
}

// --- main --------------------------------------------------------------------
const source = decodePng(
	new Uint8Array(await Bun.file(SOURCE_ICON).arrayBuffer()),
);

// Cache resized logos per pixel-size so duplicate scales aren't recomputed.
const logoCache = new Map<number, Image>();

const links: Array<{ media: string; href: string }> = [];
for (const d of DEVICES) {
	const pw = d.w * d.dpr;
	const ph = d.h * d.dpr;
	const logoSize = Math.round(Math.min(pw, ph) * LOGO_SCALE);
	let logo = logoCache.get(logoSize);
	if (!logo) {
		logo = resize(source, logoSize, logoSize);
		logoCache.set(logoSize, logo);
	}
	const png = encodePng(makeSplash(pw, ph, logo));
	const file = `splash-${d.w}x${d.h}@${d.dpr}x.png`;
	await Bun.write(join(OUT_DIR, file), png);
	links.push({
		media: `(device-width: ${d.w}px) and (device-height: ${d.h}px) and (-webkit-device-pixel-ratio: ${d.dpr}) and (orientation: portrait)`,
		href: `/splash/${file}`,
	});
	console.log(`  ${file}  ${pw}×${ph}  (${d.note})`);
}

await Bun.write(
	join(OUT_DIR, "links.json"),
	`${JSON.stringify(links, null, 2)}\n`,
);
console.log(
	`\n✅ Generated ${DEVICES.length} splash images + links.json → public/splash/`,
);
