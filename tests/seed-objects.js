// Publishes the bundled object definitions to the catalogue, with a screenshot drawn from each one.
//
//   npx http-server . -p 8432 -c-1 --silent        (in another terminal)
//   node tests/seed-objects.js                     dry run: says what it would do
//   node tests/seed-objects.js --write --token=…   creates the objects that are missing
//   node tests/seed-objects.js --write --update    also rewrites the ones already there
//
// The definitions stay bundled either way: the editor registers them at load, and a catalogue entry
// may never replace an object the editor ships with. Seeding is what puts them in the catalogue's
// own listing, with the screenshot and the description an author would otherwise write by hand.
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const DEFINITIONS_DIRECTORY = path.join(__dirname, '..', 'scripts', 'blocks', 'definitions');
const HARNESS_URL = '/tests/object-seed-harness.html';
const DEFAULT_BASE_URL = 'http://localhost:8432';
const DEFAULT_API_BASE = 'https://modellus-api.interactivebook.workers.dev';

function readArguments(argv) {
    const options = {
        write: argv.includes('--write'),
        update: argv.includes('--update'),
        baseUrl: DEFAULT_BASE_URL,
        apiBase: DEFAULT_API_BASE,
        token: process.env.MODELLUS_TOKEN || '',
        outputDirectory: ''
    };
    for (const argument of argv) {
        if (argument.startsWith('--base-url='))
            options.baseUrl = argument.substring('--base-url='.length);
        if (argument.startsWith('--api-base='))
            options.apiBase = argument.substring('--api-base='.length);
        if (argument.startsWith('--token='))
            options.token = argument.substring('--token='.length);
        if (argument.startsWith('--out='))
            options.outputDirectory = argument.substring('--out='.length);
    }
    return options;
}

function readDefinitions() {
    return fs.readdirSync(DEFINITIONS_DIRECTORY)
        .filter(name => name.endsWith('.json'))
        .sort()
        .map(name => JSON.parse(fs.readFileSync(path.join(DEFINITIONS_DIRECTORY, name), 'utf8')));
}

function reportLine(result, isDryRun) {
    const verb = { create: isDryRun ? 'would create' : 'created', update: isDryRun ? 'would update' : 'updated', skip: 'already there', failed: 'FAILED' }[result.action];
    const reference = result.error ? ` — ${result.error}` : result.id ? ` (${result.id})` : '';
    return `  ${result.action === 'failed' ? '✗' : '✓'} ${result.type.padEnd(18)} ${verb}${reference}`;
}

function writeDrawings(results, outputDirectory) {
    fs.mkdirSync(outputDirectory, { recursive: true });
    for (const result of results) {
        if (!result.svg)
            continue;
        fs.writeFileSync(path.join(outputDirectory, `${result.type}.svg`), result.svg);
        console.log(`  ↳ ${path.join(outputDirectory, `${result.type}.svg`)}`);
    }
}

(async () => {
    const options = readArguments(process.argv.slice(2));
    const definitions = readDefinitions();
    console.log(`\nSeeding ${definitions.length} bundled objects into ${options.apiBase}`);
    console.log(options.write ? 'Writing.\n' : 'Dry run: nothing will be written. Pass --write to publish.\n');
    if (options.write && !options.token) {
        console.error('A token is required to write: pass --token=… or set MODELLUS_TOKEN.');
        process.exitCode = 1;
        return;
    }
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    try {
        await page.goto(`${options.baseUrl}${HARNESS_URL}`);
        await page.waitForFunction(() => window.seedHarnessReady === true, null, { timeout: 15000 });
        const seeding = await page.evaluate(async input => {
            const seeder = window.createObjectSeeder(input.apiBase, input.token);
            return await seeder.seed(input.definitions, { write: input.write, update: input.update, includeDrawing: input.includeDrawing });
        }, {
            apiBase: options.apiBase,
            token: options.token,
            definitions: definitions,
            write: options.write,
            update: options.update,
            includeDrawing: options.outputDirectory !== ''
        });
        const results = seeding.results;
        if (seeding.catalogueProblem)
            console.log(`  ! the catalogue could not be listed (${seeding.catalogueProblem}); planning as if it were empty\n`);
        for (const result of results)
            console.log(reportLine(result, !options.write));
        if (options.outputDirectory)
            writeDrawings(results, options.outputDirectory);
        const failures = results.filter(result => result.action === 'failed');
        console.log(`\n${results.length - failures.length} of ${results.length} objects ${options.write ? 'seeded' : 'planned'}.`);
        if (failures.length > 0)
            process.exitCode = 1;
    } catch (error) {
        console.error(`\nSeeding failed: ${error.message}`);
        process.exitCode = 1;
    } finally {
        await browser.close();
    }
})();
