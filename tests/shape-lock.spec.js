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

async function setupText(page) {
    await page.evaluate(() => {
        modellus.shape.addText('Text1');
        const textShape = shell.board.shapes.getByName('Text1');
        textShape.properties.x = 200;
        textShape.properties.y = 200;
        textShape.properties.width = 150;
        textShape.properties.height = 80;
        textShape.update();
        textShape.draw();
        shell.board.selection.select(textShape);
    });
    await page.waitForTimeout(250);
}

async function getShapePosition(page) {
    return page.evaluate(() => {
        const textShape = shell.board.shapes.getByName('Text1');
        return { x: textShape.properties.x, y: textShape.properties.y };
    });
}

async function getShapeCenterOnScreen(page) {
    return page.evaluate(() => {
        const textShape = shell.board.shapes.getByName('Text1');
        const position = textShape.getBoardPosition();
        const ctm = shell.board.svg.getScreenCTM();
        const clientPoint = new DOMPoint(position.x + textShape.properties.width / 2, position.y + textShape.properties.height / 2).matrixTransform(ctm);
        return { clientX: clientPoint.x, clientY: clientPoint.y };
    });
}

async function dragShapeBy(page, dx, dy) {
    const center = await getShapeCenterOnScreen(page);
    await page.mouse.move(center.clientX, center.clientY);
    await page.mouse.down();
    await page.mouse.move(center.clientX + dx, center.clientY + dy, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(250);
}

async function setLocked(page, locked) {
    await page.evaluate(value => {
        const textShape = shell.board.shapes.getByName('Text1');
        textShape.setProperty('lockedForUsers', value);
    }, locked);
    await page.waitForTimeout(250);
}

test.describe('Shape locking', () => {
    test('locked shape cannot be dragged, unlocked shape can', async ({ page }) => {
        await setupEditor(page);
        await setupText(page);

        const initialPosition = await getShapePosition(page);
        await dragShapeBy(page, 60, 40);
        const movedPosition = await getShapePosition(page);
        expect(movedPosition.x).not.toBe(initialPosition.x);
        expect(movedPosition.y).not.toBe(initialPosition.y);

        await setLocked(page, true);
        await dragShapeBy(page, 60, 40);
        const lockedPosition = await getShapePosition(page);
        expect(lockedPosition.x).toBe(movedPosition.x);
        expect(lockedPosition.y).toBe(movedPosition.y);

        await setLocked(page, false);
        await dragShapeBy(page, 60, 40);
        const unlockedPosition = await getShapePosition(page);
        expect(unlockedPosition.x).not.toBe(lockedPosition.x);
        expect(unlockedPosition.y).not.toBe(lockedPosition.y);
    });

    test('locked shape cannot be resized with corner handles', async ({ page }) => {
        await setupEditor(page);
        await setupText(page);
        await setLocked(page, true);

        const initialSize = await page.evaluate(() => {
            const textShape = shell.board.shapes.getByName('Text1');
            return { width: textShape.properties.width, height: textShape.properties.height };
        });

        const corner = await page.evaluate(() => {
            const textShape = shell.board.shapes.getByName('Text1');
            const position = textShape.getBoardPosition();
            const ctm = shell.board.svg.getScreenCTM();
            const clientPoint = new DOMPoint(position.x + textShape.properties.width, position.y + textShape.properties.height).matrixTransform(ctm);
            return { clientX: clientPoint.x, clientY: clientPoint.y };
        });
        await page.mouse.move(corner.clientX, corner.clientY);
        await page.mouse.down();
        await page.mouse.move(corner.clientX + 50, corner.clientY + 50, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(250);

        const lockedSize = await page.evaluate(() => {
            const textShape = shell.board.shapes.getByName('Text1');
            return { width: textShape.properties.width, height: textShape.properties.height };
        });
        expect(lockedSize.width).toBe(initialSize.width);
        expect(lockedSize.height).toBe(initialSize.height);
    });

    test('locked shape can still be selected', async ({ page }) => {
        await setupEditor(page);
        await setupText(page);
        await setLocked(page, true);
        await page.evaluate(() => shell.board.selection.deselect());
        await page.waitForTimeout(250);

        const center = await getShapeCenterOnScreen(page);
        await page.mouse.move(center.clientX, center.clientY);
        await page.mouse.click(center.clientX, center.clientY);
        await page.waitForTimeout(250);

        const selectedName = await page.evaluate(() => shell.board.selection.selectedShape?.properties?.name ?? null);
        expect(selectedName).toBe('Text1');
    });
});
