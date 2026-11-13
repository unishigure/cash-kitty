import path from "node:path";

import { Image, WebView } from "bun";

const root = path.join(import.meta.dir, "..");
const outDir = path.join(root, "public/splash");
const htmlPath = path.join(root, "src/index.html");
const manifest = await Bun.file(
  path.join(root, "public/manifest.webmanifest"),
).json();

const devices = [
  { width: 320, height: 568, ratio: 2 },
  { width: 375, height: 667, ratio: 2 },
  { width: 414, height: 736, ratio: 3 },
  { width: 375, height: 812, ratio: 3 },
  { width: 414, height: 896, ratio: 2 },
  { width: 414, height: 896, ratio: 3 },
  { width: 390, height: 844, ratio: 3 },
  { width: 393, height: 852, ratio: 3 },
  { width: 402, height: 874, ratio: 3 },
  { width: 420, height: 912, ratio: 3 },
  { width: 428, height: 926, ratio: 3 },
  { width: 430, height: 932, ratio: 3 },
  { width: 440, height: 956, ratio: 3 },
  { width: 744, height: 1133, ratio: 2 },
  { width: 768, height: 1024, ratio: 2 },
  { width: 810, height: 1080, ratio: 2 },
  { width: 820, height: 1180, ratio: 2 },
  { width: 834, height: 1112, ratio: 2 },
  { width: 834, height: 1194, ratio: 2 },
  { width: 834, height: 1210, ratio: 2 },
  { width: 1024, height: 1366, ratio: 2 },
  { width: 1032, height: 1376, ratio: 2 },
];

const icon = await new Image(path.join(root, "public/icon-512.png")).dataurl();

await using view = new WebView({ backend: "chrome" });
await view.navigate("about:blank");

const links: string[] = [];
for (const { width, height, ratio } of devices) {
  for (const orientation of ["portrait", "landscape"]) {
    const [w, h] =
      orientation === "portrait"
        ? [width * ratio, height * ratio]
        : [height * ratio, width * ratio];
    const size = Math.round(Math.min(w, h) * 0.4);
    await view.cdp("Emulation.setDeviceMetricsOverride", {
      width: w,
      height: h,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await view.navigate(
      `data:text/html,${encodeURIComponent(
        `<body style="margin:0;height:100vh;display:grid;place-items:center;background:${manifest.background_color}"><img src="${icon}" width="${size}" height="${size}">`,
      )}`,
    );
    const name = `${w}x${h}.png`;
    await new Image(await view.screenshot({ encoding: "buffer" }))
      .png({ palette: true, compressionLevel: 9 })
      .write(path.join(outDir, name));
    links.push(
      `<link rel="apple-touch-startup-image" media="(device-width: ${width}px) and (device-height: ${height}px) and (-webkit-device-pixel-ratio: ${ratio}) and (orientation: ${orientation})" href="/splash/${name}" />`,
    );
  }
}

const html = (await Bun.file(htmlPath).text()).replace(
  /\s*<link\s+rel="apple-touch-startup-image"[^>]*>/g,
  "",
);
await Bun.write(
  htmlPath,
  html.replace(
    "</head>",
    `${links.map((link) => `  ${link}\n`).join("")}</head>`,
  ),
);
