const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..");
const buildDir = path.join(rootDir, "build");
const svgPath = path.join(rootDir, "scripts", "themes", "modellus.svg");

async function main() {
    const sharp = require("sharp");
    fs.mkdirSync(buildDir, { recursive: true });
    const svgBuffer = fs.readFileSync(svgPath);
    await sharp(svgBuffer)
        .resize(1024, 1024, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(path.join(buildDir, "icon.png"));
    console.log("Generated: build/icon.png");
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
