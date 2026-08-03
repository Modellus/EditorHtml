const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const BOARD_URL = '/pages/board/index.html';
const CATALOGUE_PATH = path.join(__dirname, '..', 'docs', 'architecture', 'building-blocks-catalogue.md');

function renderCatalogue(blocks) {
    const lines = [
        '# Agent-safe building-block catalogue',
        '',
        'Generated from the live registry by `tests/component-catalogue.spec.js`.',
        'Run `npx playwright test tests/component-catalogue.spec.js` after registering a block;',
        'the test fails when this file no longer matches the registry.',
        ''
    ];
    for (const category of ['primitive', 'modifier', 'behaviour', 'component']) {
        const entries = blocks.filter(block => block.category === category);
        lines.push(`## ${category[0].toUpperCase()}${category.slice(1)}s`, '');
        for (const entry of entries) {
            lines.push(`### \`${entry.type}\` — ${entry.displayName}`, '');
            lines.push(entry.description, '');
            if (entry.capabilities.length)
                lines.push(`Capabilities: ${entry.capabilities.map(capability => `\`${capability}\``).join(', ')}`, '');
            const inputs = entry.category === 'component' ? entry.parameters : entry.properties;
            if (inputs.length) {
                lines.push(entry.category === 'component' ? '| Parameter | Type | Default | Range |' : '| Property | Type | Default | Range |');
                lines.push('| --- | --- | --- | --- |');
                for (const input of inputs) {
                    const range = [
                        input.minimum === undefined || input.minimum === null ? null : `min ${input.minimum}`,
                        input.maximum === undefined || input.maximum === null ? null : `max ${input.maximum}`,
                        input.enumValues ? input.enumValues.join(' \\| ') : null
                    ].filter(Boolean).join(', ');
                    const defaultValue = input.defaultValue === undefined ? '' : JSON.stringify(input.defaultValue);
                    lines.push(`| \`${input.id}\` | ${input.valueType} | ${defaultValue} | ${range} |`);
                }
                lines.push('');
            }
            if (entry.supportsChildren)
                lines.push('Accepts children.', '');
        }
    }
    lines.push('## Example: analogue clock bound to model variables', '');
    lines.push('```js');
    lines.push("const draft = modellus.blocks.execute('create_object_draft', { name: 'Clock', componentType: 'analogue-clock' });");
    lines.push("modellus.blocks.execute('bind_variable', { draftId: draft.draftId, nodeId: 'root', property: 'hourVariable', variable: 'hour' });");
    lines.push("modellus.blocks.execute('bind_variable', { draftId: draft.draftId, nodeId: 'root', property: 'minuteVariable', variable: 'minute' });");
    lines.push("modellus.blocks.execute('validate_object', { draftId: draft.draftId });");
    lines.push("modellus.blocks.execute('render_object_preview', { draftId: draft.draftId });");
    lines.push("modellus.blocks.execute('insert_object', { draftId: draft.draftId });");
    lines.push('```');
    lines.push('');
    return lines.join('\n');
}

test('the catalogue file matches the registry', async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto(BOARD_URL);
    await page.waitForFunction(() => typeof shell !== 'undefined' && shell !== null && shell.board !== null, null, { timeout: 15000 });
    const blocks = await page.evaluate(() => BlockRegistry.list(null, { agentAccessibleOnly: true }).map(registration => BlockRegistry.describe(registration.type)));
    const catalogue = renderCatalogue(blocks);
    if (process.env.UPDATE_CATALOGUE === '1') {
        fs.writeFileSync(CATALOGUE_PATH, catalogue);
        return;
    }
    expect(fs.existsSync(CATALOGUE_PATH)).toBe(true);
    expect(fs.readFileSync(CATALOGUE_PATH, 'utf8')).toBe(catalogue);
});
