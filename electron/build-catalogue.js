// Writes the catalogue the application build carries: the sample models, every character and
// every object, with the images they draw. Reads are public, so this needs no credentials.
//
//   node electron/build-catalogue.js                 fetches into resources/catalogue
//   node electron/build-catalogue.js --api-base=…    against another deployment
//
// The snapshot is emitted as a script rather than as JSON files because the offline page is
// opened over file://, where fetch is refused: it is loaded by a <script> tag the way the
// bundled component definitions are. Images stay as files, which an <img src> reads happily.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const rootDir = path.join(__dirname, "..");
const catalogueDir = path.join(rootDir, "resources", "catalogue");
const assetsDir = path.join(catalogueDir, "assets");
const bundlePath = path.join(catalogueDir, "catalogue.generated.js");
const DEFAULT_API_BASE = "https://modellus-api.interactivebook.workers.dev";

function readArguments(argv) {
    const options = { apiBase: DEFAULT_API_BASE };
    for (const argument of argv) {
        if (argument.startsWith("--api-base="))
            options.apiBase = argument.substring("--api-base=".length);
    }
    return options;
}

// Several hundred reads against one host: a connection dropped halfway through is ordinary, and
// losing the whole collection to it is not. A refusal that repeats is reported; one that does not
// costs a second attempt.
async function fetchWithRetry(url, attempts = 4) {
    let lastProblem = null;
    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            const response = await fetch(url);
            if (response.ok)
                return response;
            if (response.status < 500)
                return response;
            lastProblem = new Error(`${response.status}`);
        } catch (error) {
            lastProblem = error;
        }
        await new Promise(resolve => setTimeout(resolve, attempt * 500));
    }
    throw new Error(`${url} could not be reached after ${attempts} attempts (${lastProblem.message}).`);
}

async function readJson(url) {
    const response = await fetchWithRetry(url);
    if (!response.ok)
        throw new Error(`${url} could not be read (${response.status}).`);
    return await response.json();
}

function readItems(page) {
    return Array.isArray(page) ? page : page.items ?? [];
}

// One file per distinct address, named after it, so a second run overwrites what it already
// fetched instead of collecting copies and the same image shared by two characters is kept once.
async function downloadAsset(assetUrl, downloaded) {
    if (typeof assetUrl !== "string" || assetUrl === "")
        return null;
    if (downloaded.has(assetUrl))
        return downloaded.get(assetUrl);
    const response = await fetchWithRetry(assetUrl);
    if (!response.ok) {
        console.log(`  ! ${assetUrl} could not be fetched (${response.status}); the card will draw without it`);
        downloaded.set(assetUrl, null);
        return null;
    }
    const extension = path.extname(new URL(assetUrl).pathname) || ".png";
    const fileName = `${crypto.createHash("sha1").update(assetUrl).digest("hex").slice(0, 16)}${extension}`;
    fs.writeFileSync(path.join(assetsDir, fileName), Buffer.from(await response.arrayBuffer()));
    const storedPath = `assets/${fileName}`;
    downloaded.set(assetUrl, storedPath);
    return storedPath;
}

async function collectObjects(apiBase, downloaded) {
    const items = readItems(await readJson(`${apiBase}/objects?limit=500`));
    const definitions = {};
    for (const item of items) {
        definitions[item.id] = await readJson(`${apiBase}/objects/${encodeURIComponent(item.id)}/definition`);
        item.thumbnail_url = await downloadAsset(item.thumbnail_url, downloaded);
    }
    console.log(`  objects        ${items.length}`);
    return { items, definitions };
}

async function collectCharacters(apiBase, downloaded) {
    const items = readItems(await readJson(`${apiBase}/characters?limit=500`));
    const categories = readItems(await readJson(`${apiBase}/character-categories`));
    const definitions = {};
    const records = {};
    for (const item of items) {
        records[item.id] = await readJson(`${apiBase}/characters/${encodeURIComponent(item.id)}`);
        const definition = await readJson(`${apiBase}/characters/${encodeURIComponent(item.id)}/definition`);
        for (const animation of definition.animations ?? []) {
            for (const frame of animation.frames ?? [])
                frame.image_url = await downloadAsset(frame.image_url, downloaded);
        }
        definition.thumbnail_url = await downloadAsset(definition.thumbnail_url, downloaded);
        definitions[item.id] = definition;
        records[item.id].thumbnail_url = await downloadAsset(records[item.id].thumbnail_url, downloaded);
        item.thumbnail_url = records[item.id].thumbnail_url;
    }
    console.log(`  characters     ${items.length} in ${categories.length} categories`);
    return { items, categories, records, definitions };
}

// Only the models marked as samples are public, so the anonymous listing is already the set the
// application ships with: what a reader without an account may open is what an installed copy has.
async function collectModels(apiBase, downloaded) {
    const items = readItems(await readJson(`${apiBase}/models/public?limit=500`));
    const records = {};
    for (const item of items) {
        records[item.id] = await readJson(`${apiBase}/models/${encodeURIComponent(item.id)}`);
        item.thumbnail_url = await downloadAsset(item.thumbnail_url, downloaded);
        records[item.id].thumbnail_url = item.thumbnail_url;
    }
    console.log(`  sample models  ${items.length}`);
    return { items, records };
}

function writeBundle(catalogue) {
    const banner = "// Generated from the catalogue by electron/build-catalogue.js.\n"
        + "// Do not edit by hand: run `npm run build:catalogue` to refresh it.\n";
    fs.writeFileSync(bundlePath, `${banner}window.ModellusLocalCatalogue = ${JSON.stringify(catalogue, null, 2)};\n`);
}

(async () => {
    const options = readArguments(process.argv.slice(2));
    console.log(`\nCollecting the catalogue from ${options.apiBase}\n`);
    fs.mkdirSync(assetsDir, { recursive: true });
    const downloaded = new Map();
    try {
        const objects = await collectObjects(options.apiBase, downloaded);
        const characters = await collectCharacters(options.apiBase, downloaded);
        const models = await collectModels(options.apiBase, downloaded);
        writeBundle({ objects, characters, models });
        const stored = Array.from(downloaded.values()).filter(Boolean).length;
        console.log(`\n  images         ${stored}`);
        console.log(`\nWritten to ${path.relative(rootDir, catalogueDir)}.\n`);
    } catch (error) {
        console.error(`\nThe catalogue could not be collected: ${error.message}\n`);
        process.exitCode = 1;
    }
})();
