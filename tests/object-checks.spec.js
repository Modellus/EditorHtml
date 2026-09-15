const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Every object the editor ships with, held to what it is supposed to do.
//
// The block suites already prove that an object compiles and that its markup has not changed. What
// neither can say is whether the object still *means* what it meant: that the speedometer reading 64
// of 160 turns its needle to −27°, that half past three stands the hour hand at 105°. Those are
// written down as checks beside the definitions, in the same shape the catalogue's object editor
// writes and runs them, so a check an author records while writing an object is the same check CI
// keeps afterwards.
//
// They deliberately carry no markup snapshot. A snapshot would make every legitimate edit to a
// definition re-record a file here as well as the generated bundle, the baselines, the visual
// snapshot and the catalogue docs; what is written down instead is the arithmetic, which only
// changes when the object's meaning does.

const BOARD_URL = '/pages/board/index.html';
const CHECKS_DIRECTORY = path.join(__dirname, 'object-checks');
const CHECKS_SCRIPT = path.join(__dirname, '..', 'scripts', 'catalog', 'objectChecks.js');

function readCheckFiles() {
    return fs.readdirSync(CHECKS_DIRECTORY)
        .filter(name => name.endsWith('.json'))
        .sort()
        .map(name => JSON.parse(fs.readFileSync(path.join(CHECKS_DIRECTORY, name), 'utf8')));
}

// The board page is the cheapest place that holds the whole block layer and a calculator. The
// checker itself is injected rather than listed in the page, because it belongs to the catalogue —
// the one surface an object is written on — and nothing on a board should be able to reach it.
async function openRunner(page) {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto(BOARD_URL);
    await page.waitForFunction(() => typeof BlockRegistry !== 'undefined' && BlockRegistry.has('clock'), null, { timeout: 15000 });
    await page.addScriptTag({ path: CHECKS_SCRIPT });
    await page.waitForFunction(() => typeof ObjectChecks !== 'undefined');
}

function describeFailures(type, results) {
    return results
        .filter(result => !result.passed)
        .map(result => `${type} — ${result.name}\n${result.failures.map(failure => `    ${failure.expectation}: ${failure.reason}`).join('\n')}`)
        .join('\n');
}

const checkFiles = readCheckFiles();

test.describe('object checks', () => {
    test('every object with checks is one the editor ships', async ({ page }) => {
        await openRunner(page);
        const missing = await page.evaluate(types => types.filter(type => !BlockDefinitionLoader.getDocument(type)),
            checkFiles.map(file => file.type));
        expect(missing, 'a checks file names an object that is not registered').toEqual([]);
    });

    for (const file of checkFiles) {
        test(`${file.type} still does what it is supposed to`, async ({ page }) => {
            await openRunner(page);
            const outcome = await page.evaluate(type => {
                const document = BlockDefinitionLoader.getDocument(type);
                return { document: document };
            }, file.type);
            expect(outcome.document, `no bundled definition for "${file.type}"`).toBeTruthy();

            const results = await page.evaluate(([type, checks]) => {
                const document = BlockDefinitionLoader.getDocument(type);
                return ObjectChecks.runAll(document, checks);
            }, [file.type, file.checks]);

            expect(results.total, 'the file declares no checks').toBeGreaterThan(0);
            expect(describeFailures(file.type, results.results)).toBe('');
            expect(results.passed).toBe(results.total);
        });
    }

    // The runner has to be able to fail, or a green run says nothing.
    test('a check that is wrong about the object fails, and says how', async ({ page }) => {
        await openRunner(page);
        const result = await page.evaluate(() => {
            const document = BlockDefinitionLoader.getDocument('speedometer');
            return ObjectChecks.run(document, {
                name: 'the needle is somewhere else entirely',
                given: { model: 'v=64', parameters: { valueVariable: 'v', maximum: 160 } },
                expect: [{ local: 'needleAngle', equals: 90 }]
            });
        });
        expect(result.passed).toBe(false);
        expect(result.failures[0].reason).toContain('-27');
    });

    test('a check naming a local that does not exist fails rather than passing quietly', async ({ page }) => {
        await openRunner(page);
        const result = await page.evaluate(() => {
            const document = BlockDefinitionLoader.getDocument('speedometer');
            return ObjectChecks.run(document, {
                name: 'a local nobody declared',
                given: {},
                expect: [{ local: 'notALocal', equals: 1 }]
            });
        });
        expect(result.passed).toBe(false);
        expect(result.failures[0].reason).toContain('no local');
    });

    // The whole point of the model on a check. Without one the object is pointed at a name nothing
    // holds, and what that does is worth writing down: the geometry is guarded and the needle rests
    // at the start of its sweep, but the readout writes the word NaN into the drawing — and neither
    // the compiler nor the validator says anything about it, because what they check is the
    // document and not the name an instance was handed. It is the reason a check names a model.
    test('the model a check names is what its formulas are worked out from', async ({ page }) => {
        await openRunner(page);
        const readings = await page.evaluate(() => {
            const document = BlockDefinitionLoader.getDocument('speedometer');
            const read = given => {
                const outcome = ObjectChecks.compile(document, given);
                return {
                    value: outcome.compilation.componentFrame.value,
                    valueIsNumber: Number.isFinite(outcome.compilation.componentFrame.value),
                    readoutText: outcome.compilation.componentFrame.readoutText,
                    needleAngle: outcome.compilation.componentFrame.needleAngle,
                    nanInDrawing: /NaN/.test(BlockRenderer.toMarkup(outcome.compilation.nodes)),
                    problems: ObjectChecks.problems(document, given).problems.length
                };
            };
            return {
                withoutModel: read({ parameters: { valueVariable: 'v', maximum: 160 } }),
                withModel: read({ model: 'v=64', parameters: { valueVariable: 'v', maximum: 160 } })
            };
        });
        expect(readings.withModel.valueIsNumber).toBe(true);
        expect(readings.withModel.value).toBe(64);
        expect(readings.withModel.readoutText).toBe('64');
        expect(readings.withModel.nanInDrawing).toBe(false);

        expect(readings.withoutModel.valueIsNumber, 'a term nothing holds reads as no number at all').toBe(false);
        expect(readings.withoutModel.needleAngle).toBe(-135);
        expect(readings.withoutModel.readoutText).toBe('NaN');
        expect(readings.withoutModel.nanInDrawing).toBe(true);
        expect(readings.withoutModel.problems, 'nothing today reports a term the model does not hold').toBe(0);
    });
});
