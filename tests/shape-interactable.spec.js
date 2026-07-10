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

async function setupSlider(page) {
    await page.evaluate(() => {
        shell.commands.addShape('SliderShape', 'Slider1');
        const sliderShape = shell.board.shapes.getByName('Slider1');
        sliderShape.properties.x = 200;
        sliderShape.properties.y = 100;
        sliderShape.properties.width = 40;
        sliderShape.properties.height = 200;
        sliderShape.properties.term = null;
        sliderShape.properties.minimum = 0;
        sliderShape.properties.maximum = 10;
        sliderShape.properties.value = 5;
        sliderShape.update();
        sliderShape.draw();
        shell.board.selection.select(sliderShape);
    });
    await page.waitForTimeout(250);
}

async function getSliderValue(page) {
    return page.evaluate(() => shell.board.shapes.getByName('Slider1').properties.value);
}

async function getSplitterPointOnScreen(page) {
    return page.evaluate(() => {
        const sliderShape = shell.board.shapes.getByName('Slider1');
        const position = sliderShape.getBoardPosition();
        const ctm = shell.board.svg.getScreenCTM();
        const clientPoint = new DOMPoint(position.x + sliderShape.properties.width / 2, sliderShape.getSplitterBoardY()).matrixTransform(ctm);
        return { clientX: clientPoint.x, clientY: clientPoint.y };
    });
}

async function getShapeCenterOnScreen(page) {
    return page.evaluate(() => {
        const sliderShape = shell.board.shapes.getByName('Slider1');
        const position = sliderShape.getBoardPosition();
        const ctm = shell.board.svg.getScreenCTM();
        const clientPoint = new DOMPoint(position.x + sliderShape.properties.width / 2, position.y + sliderShape.properties.height / 2).matrixTransform(ctm);
        return { clientX: clientPoint.x, clientY: clientPoint.y };
    });
}

async function dragSplitterBy(page, dy) {
    const point = await getSplitterPointOnScreen(page);
    await page.mouse.move(point.clientX, point.clientY);
    await page.mouse.down();
    await page.mouse.move(point.clientX, point.clientY + dy, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(250);
}

async function dragShapeBy(page, dx, dy) {
    const center = await getShapeCenterOnScreen(page);
    await page.mouse.move(center.clientX, center.clientY);
    await page.mouse.down();
    await page.mouse.move(center.clientX + dx, center.clientY + dy, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(250);
}

async function setProperty(page, name, value) {
    await page.evaluate(({ name, value }) => {
        shell.board.shapes.getByName('Slider1').setProperty(name, value);
    }, { name, value });
    await page.waitForTimeout(250);
}

test.describe('Shape interactable permission', () => {
    test('non-interactable slider ignores splitter drag but stays movable', async ({ page }) => {
        await setupEditor(page);
        await setupSlider(page);

        const initialValue = await getSliderValue(page);
        await dragSplitterBy(page, 60);
        const draggedValue = await getSliderValue(page);
        expect(draggedValue).not.toBe(initialValue);

        await setProperty(page, 'interactableForUsers', false);
        const beforeBlockedDrag = await getSliderValue(page);
        await dragSplitterBy(page, -60);
        const afterBlockedDrag = await getSliderValue(page);
        expect(afterBlockedDrag).toBe(beforeBlockedDrag);

        const initialPosition = await page.evaluate(() => {
            const s = shell.board.shapes.getByName('Slider1');
            return { x: s.properties.x, y: s.properties.y };
        });
        await dragShapeBy(page, 40, 30);
        const movedPosition = await page.evaluate(() => {
            const s = shell.board.shapes.getByName('Slider1');
            return { x: s.properties.x, y: s.properties.y };
        });
        expect(movedPosition.x).not.toBe(initialPosition.x);
        expect(movedPosition.y).not.toBe(initialPosition.y);

        await setProperty(page, 'interactableForUsers', true);
        const beforeReenabledDrag = await getSliderValue(page);
        await dragSplitterBy(page, 60);
        const afterReenabledDrag = await getSliderValue(page);
        expect(afterReenabledDrag).not.toBe(beforeReenabledDrag);
    });

    test('locked (non-movable) slider still allows splitter drag', async ({ page }) => {
        await setupEditor(page);
        await setupSlider(page);
        await setProperty(page, 'lockedForUsers', true);

        const initialValue = await getSliderValue(page);
        await dragSplitterBy(page, 60);
        const draggedValue = await getSliderValue(page);
        expect(draggedValue).not.toBe(initialValue);

        const initialPosition = await page.evaluate(() => {
            const s = shell.board.shapes.getByName('Slider1');
            return { x: s.properties.x, y: s.properties.y };
        });
        await dragShapeBy(page, 40, 30);
        const movedPosition = await page.evaluate(() => {
            const s = shell.board.shapes.getByName('Slider1');
            return { x: s.properties.x, y: s.properties.y };
        });
        expect(movedPosition.x).toBe(initialPosition.x);
        expect(movedPosition.y).toBe(initialPosition.y);
    });
});
