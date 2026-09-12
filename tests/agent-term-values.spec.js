const { test, expect } = require('@playwright/test');

const EDITOR_URL = '/pages/board/index.html';

async function setupEditor(page) {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto(EDITOR_URL);
    await page.waitForFunction(() => typeof shell !== 'undefined' && shell !== null && shell.board !== null, null, { timeout: 15000 });
}

async function buildFallingModel(page) {
    await page.evaluate(() => {
        modellus.file.new();
        modellus.model.setProperties({ independent: { name: 't', start: 0, end: 2, step: 0.1 } });
        modellus.shape.addExpression('Equations');
    });
    await page.waitForFunction(() => {
        const shape = shell.board.shapes.getByName('Equations');
        if (!shape)
            return false;
        shape.properties.expression = '\\displaylines{\\frac{dx}{dt}=v\\\\\\frac{dv}{dt}=a\\\\a=-9.8\\\\K=v\\cdot v}';
        shell.reset();
        return shell.calculator.isTerm('x') && shell.calculator.isTerm('K');
    }, null, { timeout: 15000 });
}

test('an initial condition is written through the generic setter', async ({ page }) => {
    await setupEditor(page);
    await buildFallingModel(page);
    const result = await page.evaluate(() => modellus.model.setTermValues([{ term: 'x', value: 100 }, { term: 'v', value: 0 }]));
    expect(result.rejected).toEqual([]);
    expect(result.applied).toHaveLength(2);
    const readings = await page.evaluate(() => {
        const first = shell.calculator.system.getByNameOnIteration(1, 'x', 1);
        for (let iteration = 1; iteration <= 11; iteration++)
            shell.calculator.engine.iterate();
        return { first: first, later: shell.calculator.system.getByNameOnIteration(11, 'x', 1) };
    });
    expect(readings.first).toBeCloseTo(100, 6);
    expect(readings.later).toBeLessThan(100);
});

test('a value written at a later iteration becomes a moment of its own', async ({ page }) => {
    await setupEditor(page);
    await buildFallingModel(page);
    const result = await page.evaluate(() => modellus.model.setTermValues([{ term: 'v', value: 0, iteration: 6 }]));
    expect(result.applied).toEqual([{ term: 'v', value: 0, iteration: 6, case: 1 }]);
    const atMoment = await page.evaluate(() => shell.calculator.getUserInput('v', 6, 1));
    expect(atMoment).toBe(0);
});

test('a term the model works out is refused, with the reason why', async ({ page }) => {
    await setupEditor(page);
    await buildFallingModel(page);
    const result = await page.evaluate(() => modellus.model.setTermValues([
        { term: 'K', value: 3 },
        { term: 'notATerm', value: 3 },
        { term: 'x', value: 'ten' }
    ]));
    expect(result.applied).toEqual([]);
    expect(result.rejected).toHaveLength(3);
    expect(result.rejected[0].reason).toContain('worked out by the model');
    expect(result.rejected[1].reason).toContain('no term called "notATerm"');
    expect(result.rejected[2].reason).toContain('not a number');
});

test('initial conditions are written per case', async ({ page }) => {
    await setupEditor(page);
    await buildFallingModel(page);
    await page.evaluate(() => {
        modellus.model.setProperties({ casesCount: 2 });
        shell.reset();
    });
    const result = await page.evaluate(() => modellus.model.setTermValues([
        { term: 'x', value: 10, case: 1 },
        { term: 'x', value: 20, case: 2 },
        { term: 'x', value: 30, case: 9 }
    ]));
    expect(result.applied).toHaveLength(2);
    expect(result.rejected[0].reason).toContain('outside the 2');
    const byCase = await page.evaluate(() => [
        shell.calculator.system.getByNameOnIteration(1, 'x', 1),
        shell.calculator.system.getByNameOnIteration(1, 'x', 2)
    ]);
    expect(byCase[0]).toBeCloseTo(10, 6);
    expect(byCase[1]).toBeCloseTo(20, 6);
});

test('the values digest stands in for the whole run', async ({ page }) => {
    await setupEditor(page);
    await buildFallingModel(page);
    await page.evaluate(() => {
        for (let iteration = 1; iteration <= 20; iteration++)
            shell.calculator.engine.iterate();
    });
    const digest = await page.evaluate(() => modellus.model.getValuesDigest());
    expect(digest.terms).toContain('x');
    expect(digest.iterations).toBeGreaterThan(8);
    expect(digest.cases).toHaveLength(1);
    expect(digest.cases[0].sample.length).toBeLessThanOrEqual(8);
    expect(digest.cases[0].sample[0].iteration).toBe(1);
    expect(digest.cases[0].ranges.x.minimum).toBeLessThanOrEqual(digest.cases[0].ranges.x.maximum);
    expect(JSON.stringify(digest).length).toBeLessThan(JSON.stringify(await page.evaluate(() => modellus.model.getValues())).length);
});
