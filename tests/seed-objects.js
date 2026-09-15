// Publishes the objects this build carries into the catalogue, with a screenshot drawn from each.
//
//   npx http-server . -p 8432 -c-1 --silent        (in another terminal)
//   node tests/seed-objects.js                     dry run: says what it would do
//   node tests/seed-objects.js --write --token=…   creates the objects that are missing
//   node tests/seed-objects.js --write --update    also rewrites the ones already there
//   node tests/seed-objects.js --only=steering-wheel   works on the named objects and no others
//
// This is the direction the objects travel exactly once: into a catalogue that does not have them
// yet. After that the catalogue is where an object lives — it is written in the block shape editor
// and flagged there as bundled — and the traffic runs the other way, with `npm run build:definitions`
// generating this build's bundle from what the catalogue holds. So what is seeded is whatever the
// bundle currently registers, and it is seeded already flagged as bundled.
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const HARNESS_URL = '/tests/object-seed-harness.html';
const DEFAULT_BASE_URL = 'http://localhost:8432';
const { API_HOST: DEFAULT_API_BASE } = require('./apiHost');

function readArguments(argv) {
    const options = {
        write: argv.includes('--write'),
        update: argv.includes('--update'),
        baseUrl: DEFAULT_BASE_URL,
        apiBase: DEFAULT_API_BASE,
        token: process.env.MODELLUS_TOKEN || '',
        outputDirectory: '',
        only: []
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
        // Rewriting one object should not rewrite the rest: --update on its own reaches every entry
        // already in the catalogue, so a run that means to publish a single definition names it.
        if (argument.startsWith('--only='))
            options.only = argument.substring('--only='.length).split(',').map(type => type.trim()).filter(Boolean);
    }
    return options;
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
        // The documents come from the bundle the harness loaded rather than from files on disk:
        // there are no files any more, and the bundle is what this build actually carries.
        const definitions = await page.evaluate(only => [...BlockDefinitionLoader.documents.values()]
            .filter(document => ObjectSeeder.isCatalogueObject(document))
            .filter(document => only.length === 0 || only.includes(document.type))
            .sort((left, right) => left.type.localeCompare(right.type)), options.only);
        if (definitions.length === 0) {
            console.error(options.only.length ? `No bundled object is named by --only=${options.only.join(',')}.` : 'This build carries no objects to seed.');
            process.exitCode = 1;
            return;
        }
        console.log(`\nSeeding ${definitions.length} objects into ${options.apiBase}`);
        console.log(options.write ? 'Writing.\n' : 'Dry run: nothing will be written. Pass --write to publish.\n');
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
