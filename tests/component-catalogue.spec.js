const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const BOARD_URL = '/pages/board/index.html';
const CATALOGUE_PATH = path.join(__dirname, '..', 'docs', 'architecture', 'building-blocks-catalogue.md');
const REFERENCE_PATH = path.join(__dirname, '..', 'docs', 'blocks', 'reference.html');
const REFERENCE_START = '<!-- generated:blocks-start -->';
const REFERENCE_END = '<!-- generated:blocks-end -->';
const REFERENCE_SECTIONS = [
    ['primitive', 'Primitives', 'The blocks that draw. A node names one as its <code>type</code>, and sets these under <code>properties</code> as constants or under <code>bindings</code> as declarative values.'],
    ['modifier', 'Modifiers', 'Applied to a node and everything under it, in the order the <code>modifiers</code> array lists them.'],
    ['behaviour', 'Behaviours', 'What the reader can do to a node, and what that writes. Listed on the node under <code>behaviours</code>.'],
    ['component', 'Components', 'Ready-made assemblies. A node names one as its <code>type</code> and sets these under <code>parameters</code>.']
];

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
    lines.push('## Example: clock bound to model variables', '');
    lines.push('```js');
    lines.push("const draft = modellus.blocks.execute('create_object_draft', { name: 'Clock', componentType: 'clock' });");
    lines.push("modellus.blocks.execute('bind_variable', { draftId: draft.draftId, nodeId: 'root', property: 'hourVariable', variable: 'hour' });");
    lines.push("modellus.blocks.execute('bind_variable', { draftId: draft.draftId, nodeId: 'root', property: 'minuteVariable', variable: 'minute' });");
    lines.push("modellus.blocks.execute('validate_object', { draftId: draft.draftId });");
    lines.push("modellus.blocks.execute('render_object_preview', { draftId: draft.draftId });");
    lines.push("modellus.blocks.execute('insert_object', { draftId: draft.draftId });");
    lines.push('```');
    lines.push('');
    return lines.join('\n');
}

function escapeHtml(value) {
    return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderInputRange(input) {
    return [
        input.minimum === undefined || input.minimum === null ? null : `min ${input.minimum}`,
        input.maximum === undefined || input.maximum === null ? null : `max ${input.maximum}`,
        input.enumValues ? input.enumValues.join(' | ') : null
    ].filter(Boolean).join(', ');
}

function renderInputTable(entry) {
    const inputs = entry.category === 'component' ? entry.parameters : entry.properties;
    if (!inputs.length)
        return [];
    const heading = entry.category === 'component' ? 'Parameter' : 'Property';
    const rows = inputs.map(input => {
        const defaultValue = input.defaultValue === undefined ? '' : `<code>${escapeHtml(JSON.stringify(input.defaultValue))}</code>`;
        const range = renderInputRange(input);
        return `                <tr><td><code>${escapeHtml(input.id)}</code></td><td>${escapeHtml(input.valueType)}</td><td>${defaultValue}</td><td>${escapeHtml(range)}</td></tr>`;
    });
    return [
        '        <table class="docs-table">',
        `            <thead><tr><th>${heading}</th><th>Type</th><th>Default</th><th>Range</th></tr></thead>`,
        '            <tbody>',
        ...rows,
        '            </tbody>',
        '        </table>'
    ];
}

function renderReferenceEntry(entry) {
    const lines = [
        `        <h3 id="block-${entry.type}"><code>${escapeHtml(entry.type)}</code> — ${escapeHtml(entry.displayName)}</h3>`,
        `        <p>${escapeHtml(entry.description)}</p>`
    ];
    if (entry.capabilities.length)
        lines.push(`        <p class="block-meta">Capabilities: ${entry.capabilities.map(capability => `<code>${escapeHtml(capability)}</code>`).join(' ')}</p>`);
    lines.push(...renderInputTable(entry));
    if (entry.supportsChildren)
        lines.push('        <p class="block-meta">Accepts children.</p>');
    return lines;
}

function renderReferenceBlocks(blocks, tokens, presetNames) {
    const lines = [];
    for (const [category, title, intro] of REFERENCE_SECTIONS) {
        const entries = blocks.filter(block => block.category === category);
        lines.push(`        <h2 id="${category}s">${title}</h2>`);
        lines.push(`        <p>${intro}</p>`);
        lines.push(`        <p class="block-index">${entries.map(entry => `<a href="#block-${entry.type}">${escapeHtml(entry.type)}</a>`).join(' ')}</p>`);
        for (const entry of entries)
            lines.push(...renderReferenceEntry(entry));
    }
    lines.push('        <h2 id="tokens">Design tokens</h2>');
    lines.push('        <p>The board\'s own colours, widths, fonts, axis and crosshair numbers. Write one as a default with <code>"token:stroke.accent"</code>, or read one with the binding <code>{ "token": "stroke.accent" }</code> — never the literal value, so a preset restyles every object at once.</p>');
    lines.push(`        <p class="block-meta">Values below are the <code>standard</code> preset. The presets are ${presetNames.map(name => `<code>${escapeHtml(name)}</code>`).join(' ')}; each one overrides some of these and inherits the rest.</p>`);
    lines.push('        <table class="docs-table">');
    lines.push('            <thead><tr><th>Token</th><th>Standard value</th></tr></thead>');
    lines.push('            <tbody>');
    for (const [name, value] of Object.entries(tokens))
        lines.push(`                <tr><td><code>${escapeHtml(name)}</code></td><td><code>${escapeHtml(JSON.stringify(value))}</code></td></tr>`);
    lines.push('            </tbody>');
    lines.push('        </table>');
    return lines.join('\n');
}

function renderReferencePage(template, blocks, tokens, presetNames) {
    const start = template.indexOf(REFERENCE_START);
    const end = template.indexOf(REFERENCE_END);
    return `${template.slice(0, start + REFERENCE_START.length)}\n${renderReferenceBlocks(blocks, tokens, presetNames)}\n${template.slice(end)}`;
}

test('the catalogue and the block reference match the registry', async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto(BOARD_URL);
    await page.waitForFunction(() => typeof shell !== 'undefined' && shell !== null && shell.board !== null, null, { timeout: 15000 });
    const blocks = await page.evaluate(() => BlockRegistry.list(null, { agentAccessibleOnly: true }).map(registration => BlockRegistry.describe(registration.type)));
    const tokens = await page.evaluate(() => BlockTokens.presets.standard);
    const presetNames = await page.evaluate(() => BlockTokens.getPresetNames());
    const catalogue = renderCatalogue(blocks);
    const reference = renderReferencePage(fs.readFileSync(REFERENCE_PATH, 'utf8'), blocks, tokens, presetNames);
    if (process.env.UPDATE_CATALOGUE === '1') {
        fs.writeFileSync(CATALOGUE_PATH, catalogue);
        fs.writeFileSync(REFERENCE_PATH, reference);
        return;
    }
    expect(fs.existsSync(CATALOGUE_PATH)).toBe(true);
    expect(fs.readFileSync(CATALOGUE_PATH, 'utf8')).toBe(catalogue);
    expect(fs.readFileSync(REFERENCE_PATH, 'utf8')).toBe(reference);
});
