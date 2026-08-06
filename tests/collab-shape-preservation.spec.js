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

test('a remote snapshot that omits a local shape does not delete it', async ({ page }) => {
    await setupEditor(page);
    const result = await page.evaluate(() => {
        modellus.shape.addExpression('Remote1');
        const snapshotWithoutLocalShape = JSON.parse(JSON.stringify(shell.serialize()));
        modellus.shape.addExpression('LocalOnly1');
        const localOnlyShape = shell.board.shapes.getByName('LocalOnly1');
        snapshotWithoutLocalShape.collab = { version: 99, clientId: 'other-client', removedShapeIds: [] };
        shell.collabCoordinator = { channel: null, isApplyingRemote: () => true };
        shell.applyRemoteSnapshot(snapshotWithoutLocalShape);
        return {
            names: shell.board.shapes.shapes.map(shape => shape.properties.name),
            localOnlyStillThere: shell.board.shapes.getById(localOnlyShape.id) != null
        };
    });
    expect(result.localOnlyStillThere).toBe(true);
    expect(result.names).toContain('Remote1');
    expect(result.names).toContain('LocalOnly1');
});

test('a remote snapshot honours shapes it reports as deleted', async ({ page }) => {
    await setupEditor(page);
    const remainingNames = await page.evaluate(() => {
        modellus.shape.addExpression('Kept1');
        const snapshotWithoutLocalShape = JSON.parse(JSON.stringify(shell.serialize()));
        modellus.shape.addExpression('Deleted1');
        const deletedShape = shell.board.shapes.getByName('Deleted1');
        snapshotWithoutLocalShape.collab = { version: 99, clientId: 'other-client', removedShapeIds: [deletedShape.id] };
        shell.collabCoordinator = { channel: null, isApplyingRemote: () => true };
        shell.applyRemoteSnapshot(snapshotWithoutLocalShape);
        return shell.board.shapes.shapes.map(shape => shape.properties.name);
    });
    expect(remainingNames).toContain('Kept1');
    expect(remainingNames).not.toContain('Deleted1');
});

test('an unknown shape type does not truncate the board and survives a save round trip', async ({ page }) => {
    await setupEditor(page);
    const result = await page.evaluate(() => {
        modellus.shape.addExpression('Before1');
        const definition = JSON.parse(JSON.stringify(shell.serialize()));
        const beforeShape = definition.board.find(data => data.properties.name === 'Before1');
        definition.board.push({ type: 'ShapeFromTheFuture', id: 'future-shape-id', parent: undefined, properties: { name: 'Future1' } });
        definition.board.push(JSON.parse(JSON.stringify({ ...beforeShape, id: 'after-shape-id', properties: { ...beforeShape.properties, name: 'After1' } })));
        shell.deserialise(definition);
        const reserialized = shell.serialize();
        return {
            loadedNames: shell.board.shapes.shapes.map(shape => shape.properties.name),
            unloadedCount: shell.board.unloadedShapes.length,
            savedIds: reserialized.board.map(data => String(data.id))
        };
    });
    expect(result.loadedNames).toContain('Before1');
    expect(result.loadedNames).toContain('After1');
    expect(result.unloadedCount).toBe(1);
    expect(result.savedIds).toContain('future-shape-id');
});
