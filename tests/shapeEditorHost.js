const { API_GLOB } = require('./apiHost');

// The block shape editor, opened the way the three specs around it need it. It is one helper rather
// than three copies of the same thirty lines because the page has exactly one way in: a session, the
// maintenance flag, and either an object to load or nothing at all.

const SHAPE_EDITOR_URL = '/pages/shape-editor/index.html';
const CATALOG_URL = '/pages/catalog/index.html';

// A dial whose needle is turned by a formula, which is the shape of the problem the workbench
// exists for: until the test bed, a definition reading a term it had never been given still drew
// "successfully" with every radius at zero.
const DIAL = {
    schemaVersion: '1.0.0',
    type: 'test-dial',
    category: 'component',
    displayName: 'Test dial',
    description: 'A dial whose needle is turned by a term.',
    icon: 'fa-light fa-gauge',
    tags: ['object'],
    parameters: [
        { id: 'valueVariable', label: 'Value', valueType: 'variable', defaultValue: '0', category: 'model' },
        { id: 'maximum', label: 'Maximum', valueType: 'number', defaultValue: 160, category: 'scale' }
    ],
    locals: [
        { id: 'w', value: { parameter: '$width' } },
        { id: 'h', value: { parameter: '$height' } },
        { id: 'r', formula: '\\max\\left(4,\\frac{\\min\\left(w,h\\right)}{2}-6\\right)' },
        { id: 'value', value: { parameter: 'valueVariable', as: 'number' } },
        { id: 'ratio', formula: '\\max\\left(0,\\min\\left(1,\\frac{value}{maximum}\\right)\\right)' },
        { id: 'sweepAngle', formula: 'ratio\\cdot270' }
    ],
    root: {
        id: 'test-dial',
        type: 'group',
        children: [
            { id: 'face', type: 'circle', bindings: { radius: { parameter: 'r' } }, properties: { centerX: 90, centerY: 90, fill: '#f7f7f7', stroke: '#1e1e1e', strokeWidth: 2 } },
            {
                id: 'needle', type: 'line',
                properties: { x1: 90, y1: 90, x2: 90, y2: 20, stroke: '#e03130', strokeWidth: 5 },
                modifiers: [{ type: 'rotate', angle: { parameter: 'sweepAngle' }, centerX: 90, centerY: 90 }]
            }
        ]
    }
};

// Nothing here reaches the live catalogue. The object endpoints answer for one object so the page
// can be opened on something, and the flag decides whether the page opens at all.
async function stubApi(page, { maintenance = true, object = null } = {}) {
    await page.route(API_GLOB, route => {
        const url = new URL(route.request().url());
        const path = url.pathname;
        if (path.endsWith('/feature-flags'))
            return route.fulfill({ json: maintenance ? [{ key: 'can_access_maintenance', is_enabled: 1 }] : [] });
        if (/^\/users\/[^/]+$/.test(path))
            return route.fulfill({ json: { id: 'user-1', name: 'Tester', role: 'teacher', country: 'PT', preferredLanguage: 'en-US' } });
        if (path.endsWith('/definition'))
            return route.fulfill({ json: object?.definition ?? DIAL });
        if (/^\/objects\/[^/]+$/.test(path) && route.request().method() === 'PUT')
            return route.fulfill({ json: { id: 'object-1' } });
        if (/^\/objects\/[^/]+$/.test(path))
            return route.fulfill({ json: object ?? { id: 'object-1', title: 'Test dial', description: null } });
        if (path === '/objects' && route.request().method() === 'POST')
            return route.fulfill({ json: { id: 'object-new', title: 'Test dial' } });
        if (path === '/objects')
            return route.fulfill({ json: { items: [], total: 0 } });
        if (path.endsWith('/facets'))
            return route.fulfill({ json: { education: [], sciences: [], categories: [], uncategorized: 0, total: 0 } });
        return route.fulfill({ json: [] });
    });
}

async function signIn(page) {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'user-1', exp: Math.floor(Date.now() / 1000) + 86400 }));
        localStorage.setItem('mp.user', JSON.stringify({ id: 'user-1', name: 'Tester', role: 'teacher', country: 'PT', preferredLanguage: 'en-US' }));
        // Checks are kept per type while an object is being written, and one left over from another
        // run would decide what this one sees. Cleared once per tab rather than on every navigation:
        // this script runs again on each one, and a test that reopens the editor to find its checks
        // again would otherwise be handed a store this very line had just emptied.
        if (!sessionStorage.getItem('mdl.test.storeCleared')) {
            localStorage.removeItem('mdl.catalog.checks.test-dial');
            sessionStorage.setItem('mdl.test.storeCleared', '1');
        }
    });
}

// The editor standing on the dial, on a model that holds what it reads — the only state in which
// any of its formulas mean anything, and so the only state in which an edit to one can be judged.
async function openShapeEditor(page, { objectId = null, definition = DIAL, model = 'v=64', parameters = { valueVariable: 'v', maximum: 160 }, maintenance = true } = {}) {
    await stubApi(page, { maintenance });
    await signIn(page);
    await page.goto(objectId ? `${SHAPE_EDITOR_URL}?object_id=${objectId}` : SHAPE_EDITOR_URL);
    if (!maintenance) {
        await page.waitForSelector('.shape-editor-refused');
        return;
    }
    await page.waitForSelector('#object-definition-editor');
    await page.waitForFunction(() => typeof ObjectWorkbench !== 'undefined' && window.shapeEditorApp?.workbench);
    if (definition)
        await page.evaluate(text => window.shapeEditorApp.setDefinition(text), JSON.stringify(definition, null, 2));
    if (model !== null) {
        await page.fill('#object-testbed-model', model);
        await page.fill('#object-testbed-parameters', JSON.stringify(parameters));
        await page.waitForTimeout(600);
    }
}

module.exports = { SHAPE_EDITOR_URL, CATALOG_URL, DIAL, stubApi, signIn, openShapeEditor };
