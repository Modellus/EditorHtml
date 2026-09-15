// Builds the editor's object bundle from the catalogue.
//
//   node electron/build-definitions.js                     reads the deployed catalogue
//   node electron/build-definitions.js --api-base=…        reads another one
//   node electron/build-definitions.js --check             fails if the bundle on disk is stale
//
// Which objects the editor ships with is not written down in this repository, and deliberately so:
// it used to be the set of files in scripts/blocks/definitions, which meant adding a shape to the
// bundle was a commit, a review and a release. It is now the `is_bundled` flag on the catalogue row,
// which an author sets in the catalogue itself — and this is what turns that flag into the file the
// browser loads.
//
// A build that cannot reach the catalogue stops. Falling back to whatever bundle happened to be on
// disk would mean a release could ship objects nobody chose, with nothing in the log to say so.
const fs = require("fs");
const path = require("path");

const BUNDLE_PATH = path.join(__dirname, "..", "scripts", "blocks", "definitions", "definitions.generated.js");
const DEFAULT_API_BASE = "https://modellus-api.interactivebook.workers.dev";

function readArguments(argv) {
    const options = { apiBase: process.env.MODELLUS_API_BASE || DEFAULT_API_BASE, check: argv.includes("--check") };
    for (const argument of argv) {
        if (argument.startsWith("--api-base="))
            options.apiBase = argument.substring("--api-base=".length);
    }
    return options;
}

// The browser cannot fetch a .json file when the offline build runs from file://, so the
// definitions are delivered as one generated script rather than as documents fetched at load.
function renderBundle(documents, apiBase) {
    return [
        `// Generated from the catalogue at ${apiBase} by electron/build-definitions.js.`,
        "// Do not edit by hand: it is every object the catalogue has flagged as bundled. To change what",
        "// is here, change the object in the block shape editor or its bundle flag in the catalogue,",
        "// then run `npm run build:definitions`.",
        `BlockDefinitionLoader.registerAll(${JSON.stringify(documents, null, 4)});`,
        ""
    ].join("\n");
}

async function readBundle(apiBase) {
    const url = `${apiBase.replace(/\/$/, "")}/objects/bundle`;
    let response = null;
    try {
        response = await fetch(url);
    } catch (error) {
        throw new Error(`The catalogue at ${url} could not be reached: ${error.message}`);
    }
    if (!response.ok)
        throw new Error(`The catalogue at ${url} answered ${response.status}.`);
    const payload = await response.json();
    const objects = payload?.objects;
    if (!Array.isArray(objects))
        throw new Error(`The catalogue at ${url} did not answer with a bundle.`);
    // An empty bundle is a catalogue nobody has flagged anything in, and a release carrying no
    // objects at all is far more likely to be that mistake than an intention.
    if (objects.length === 0)
        throw new Error(`The catalogue at ${url} has no object flagged as bundled, so there is nothing to ship.`);
    return objects.map(entry => entry.definition);
}

(async () => {
    const options = readArguments(process.argv.slice(2));
    try {
        const documents = await readBundle(options.apiBase);
        const bundle = renderBundle(documents, options.apiBase);
        if (options.check) {
            const current = fs.existsSync(BUNDLE_PATH) ? fs.readFileSync(BUNDLE_PATH, "utf8") : "";
            if (current === bundle) {
                console.log(`The bundle is up to date: ${documents.length} objects.`);
                return;
            }
            console.error("The bundle on disk is not what the catalogue says it should be. Run `npm run build:definitions`.");
            process.exitCode = 1;
            return;
        }
        fs.writeFileSync(BUNDLE_PATH, bundle);
        console.log(`Wrote ${documents.length} objects into ${path.relative(process.cwd(), BUNDLE_PATH)}:`);
        for (const document of documents)
            console.log(`  ${document.type}`);
    } catch (error) {
        console.error(`\nThe object bundle could not be built: ${error.message}\n`);
        process.exitCode = 1;
    }
})();
