const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ARTIFACT_PATH = path.join(__dirname, '..', 'resources', 'models', 'agent-block-tools.json');

// The chat agent runs on a worker that cannot reach into the browser to ask what objects exist, so
// the tool list every object publishes for itself is written out here and read from the file there.
// The definitions stay the source of truth and this test fails when the file no longer matches them.
async function readToolDefinitions(page) {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto('/pages/board/index.html');
    await page.waitForFunction(() => typeof shell !== 'undefined' && shell !== null && shell.board !== null, null, { timeout: 15000 });
    return await page.evaluate(() => modellus.blocks.getAgentToolDefinitions());
}

function renderArtifact(definitions) {
    return `${JSON.stringify({ generatedFrom: 'scripts/blocks/definitions/*.json', tools: definitions }, null, 4)}\n`;
}

test('the agent block tool artifact matches the registered objects', async ({ page }) => {
    const artifact = renderArtifact(await readToolDefinitions(page));
    if (process.env.UPDATE_AGENT_TOOLS === '1') {
        fs.writeFileSync(ARTIFACT_PATH, artifact);
        return;
    }
    expect(fs.existsSync(ARTIFACT_PATH)).toBe(true);
    expect(fs.readFileSync(ARTIFACT_PATH, 'utf8')).toBe(artifact);
});

test('every object publishes a tool the agent can call', async ({ page }) => {
    const definitions = await readToolDefinitions(page);
    expect(definitions.length).toBeGreaterThan(0);
    const registered = await page.evaluate(() => Object.keys(modellus.blocks.tools));
    for (const definition of definitions) {
        expect(definition.name, definition.componentType).toMatch(/^add_[a-z0-9_]+$/);
        expect(definition.description.length, definition.componentType).toBeGreaterThan(40);
        expect(registered, definition.componentType).toContain(definition.name);
        expect(Object.keys(definition.inputSchema.properties.parameters.properties).length, definition.componentType).toBeGreaterThan(0);
    }
});

test('an object tool places the object it names and reports the parameters it did not know', async ({ page }) => {
    await readToolDefinitions(page);
    const result = await page.evaluate(() => modellus.blocks.tools.add_thermometer({
        name: 'Bath',
        parameters: { valueVariable: '20', maximum: 60, notAParameter: 1 }
    }));
    expect(result.name).toBe('Bath');
    expect(result.ignored).toEqual(['notAParameter']);
    const placed = await page.evaluate(() => {
        const shape = shell.board.shapes.getByName('Bath');
        return { type: shape.constructor.name, valueVariable: shape.properties.valueVariable, maximum: shape.properties.maximum };
    });
    expect(placed).toEqual({ type: 'ComponentShape', valueVariable: '20', maximum: 60 });
});
