const { test, expect } = require('@playwright/test');

const EDITOR_URL = '/pages/board/index.html';

async function setupEditor(page) {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto(EDITOR_URL);
    await page.waitForFunction(() => typeof shell !== 'undefined' && shell !== null && shell.board !== null, null, { timeout: 15000 });
    await page.waitForTimeout(500);
}

// A coordinator already past the joining handshake, writing to a channel that records what it is
// given instead of a socket.
async function connectedCoordinator(page) {
    await page.evaluate(() => {
        window.sentMessages = [];
        window.coordinator = new CollabCoordinator({
            apiBase: 'https://example.invalid',
            modelId: 'model-1',
            getToken: () => 'test',
            getSnapshot: () => shell.serialize(),
            getRemovedShapeIds: () => [],
            onRemoteOp: () => {},
            onRemoteSnapshot: () => {}
        });
        window.coordinator.channel = {
            sendOp: op => window.sentMessages.push({ type: 'op', op: op }),
            sendSnapshot: model => window.sentMessages.push({ type: 'snapshot', model: model }),
            destroy: () => {}
        };
        window.coordinator._pendingInitialSnapshot = false;
    });
}

test('a shape property change publishes the room snapshot', async ({ page }) => {
    await setupEditor(page);
    await connectedCoordinator(page);
    await page.evaluate(() => {
        modellus.shape.addExpression('Edited1');
        const shape = shell.board.shapes.getByName('Edited1');
        shape.properties.opacity = 0.5;
        window.coordinator.sendOp({ type: 'setShapeProperties', shapeId: shape.id, properties: Utils.cloneProperties(shape.properties) });
    });
    await page.waitForTimeout(2600);
    const published = await page.evaluate(() => {
        const snapshots = window.sentMessages.filter(message => message.type === 'snapshot');
        const shape = shell.board.shapes.getByName('Edited1');
        return {
            count: snapshots.length,
            opacity: snapshots[snapshots.length - 1]?.model.board.find(data => String(data.id) === String(shape.id))?.properties.opacity ?? null
        };
    });
    expect(published.count).toBe(1);
    expect(published.opacity).toBe(0.5);
});

test('a burst of changes publishes the snapshot once', async ({ page }) => {
    await setupEditor(page);
    await connectedCoordinator(page);
    await page.evaluate(() => {
        modellus.shape.addExpression('Edited2');
        const shape = shell.board.shapes.getByName('Edited2');
        for (let step = 0; step < 5; step++)
            window.coordinator.sendOp({ type: 'setShapeProperties', shapeId: shape.id, properties: { x: step } });
    });
    await page.waitForTimeout(2600);
    const counts = await page.evaluate(() => ({
        operations: window.sentMessages.filter(message => message.type === 'op').length,
        snapshots: window.sentMessages.filter(message => message.type === 'snapshot').length
    }));
    expect(counts.operations).toBe(5);
    expect(counts.snapshots).toBe(1);
});

test('cursors and playback leave the room snapshot alone', async ({ page }) => {
    await setupEditor(page);
    await connectedCoordinator(page);
    await page.evaluate(() => {
        window.coordinator.sendOp({ type: 'cursor', clientId: 'a', x: 1, y: 2 });
        window.coordinator.sendOp({ type: 'presence', clientId: 'a' });
        window.coordinator.sendOp({ type: 'playback', action: 'play', iteration: 1 });
    });
    await page.waitForTimeout(2600);
    const snapshots = await page.evaluate(() => window.sentMessages.filter(message => message.type === 'snapshot').length);
    expect(snapshots).toBe(0);
});

test('leaving before the snapshot is due publishes it on the way out', async ({ page }) => {
    await setupEditor(page);
    await connectedCoordinator(page);
    const snapshots = await page.evaluate(() => {
        modellus.shape.addExpression('Edited3');
        const shape = shell.board.shapes.getByName('Edited3');
        shape.properties.opacity = 0.25;
        window.coordinator.sendOp({ type: 'setShapeProperties', shapeId: shape.id, properties: Utils.cloneProperties(shape.properties) });
        window.coordinator.destroy();
        return window.sentMessages.filter(message => message.type === 'snapshot').map(message => message.model.board.find(data => String(data.id) === String(shape.id))?.properties.opacity ?? null);
    });
    expect(snapshots).toEqual([0.25]);
});

// The recording a mouse tracker holds is a shape property and reaches other clients as an operation.
// Without a snapshot behind it the room would still be handing out the state from before it.
test('a recording written into a component reaches the room snapshot', async ({ page }) => {
    await setupEditor(page);
    await connectedCoordinator(page);
    await page.evaluate(() => {
        const shape = shell.commands.addComponent('mouse-tracker', 'Tracker');
        window.sentMessages.length = 0;
        shape.dragStart();
        shape.appendMemoryRow('samples', BlockMemory.createRow('', 1, 2), 600);
        shape.appendMemoryRow('samples', BlockMemory.createRow('', 3, 4), 600);
        shape.dragEnd();
        window.coordinator.sendOp({ type: 'setShapeProperties', shapeId: shape.id, properties: Utils.cloneProperties(shape.properties) });
    });
    await page.waitForTimeout(2600);
    const rows = await page.evaluate(() => {
        const snapshots = window.sentMessages.filter(message => message.type === 'snapshot');
        const shape = shell.board.shapes.getByName('Tracker');
        return snapshots[snapshots.length - 1]?.model.board.find(data => String(data.id) === String(shape.id))?.properties.samples ?? null;
    });
    expect(rows).toEqual([{ x: 1, y: 2 }, { x: 3, y: 4 }]);
});
