const { test, expect } = require('@playwright/test');

const BOARD_URL = '/pages/board/index.html';

async function setupBoard(page) {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto(BOARD_URL);
    await page.waitForFunction(() => typeof shell !== 'undefined' && shell !== null && shell.board !== null, null, { timeout: 15000 });
    await page.waitForTimeout(500);
}

async function addNamedBody(page) {
    await page.evaluate(() => {
        modellus.shape.addBody('Body1');
        const bodyShape = shell.board.shapes.getByName('Body1');
        bodyShape.properties.x = 300;
        bodyShape.properties.y = 260;
        bodyShape.properties.showName = true;
        bodyShape.update();
        bodyShape.draw();
    });
    await page.waitForTimeout(250);
}

function readNameLabel(shapeExpression) {
    return `(() => {
        const shape = ${shapeExpression};
        const background = shape.shapeNameBackground;
        return {
            text: shape.shapeNameText.textContent,
            fill: shape.shapeNameText.getAttribute('fill'),
            fontSize: shape.shapeNameText.style.fontSize,
            renderedFontSize: getComputedStyle(shape.shapeNameText).fontSize,
            y: Number(shape.shapeNameText.getAttribute('y')),
            backgroundDisplay: background.getAttribute('display'),
            backgroundFill: background.getAttribute('fill'),
            backgroundWidth: Number(background.getAttribute('width')),
            backgroundHeight: Number(background.getAttribute('height')),
            backgroundIsBehindText: background.nextElementSibling === shape.shapeNameText
        };
    })()`;
}

test.describe('shape name label styling', () => {
    test('defaults to the base font size with no background', async ({ page }) => {
        await setupBoard(page);
        await addNamedBody(page);
        const label = await page.evaluate(readNameLabel(`shell.board.shapes.getByName('Body1')`));
        expect(label.text).toBe('Body1');
        expect(label.renderedFontSize).toBe('10px');
        expect(label.backgroundDisplay).toBe('none');
    });

    test('applies font size, color and background color', async ({ page }) => {
        await setupBoard(page);
        await addNamedBody(page);
        await page.evaluate(() => {
            const bodyShape = shell.board.shapes.getByName('Body1');
            bodyShape.setPropertyCommand('nameFontSize', 24);
            bodyShape.setPropertyCommand('nameColor', '#FF0000');
            bodyShape.setPropertyCommand('nameBackgroundColor', '#FFFF00');
        });
        await page.waitForTimeout(250);
        const label = await page.evaluate(readNameLabel(`shell.board.shapes.getByName('Body1')`));
        expect(label.renderedFontSize).toBe('24px');
        expect(label.fill).toBe('#FF0000');
        expect(label.backgroundDisplay).toBeNull();
        expect(label.backgroundFill).toBe('#FFFF00');
        expect(label.backgroundWidth).toBeGreaterThan(0);
        expect(label.backgroundHeight).toBeGreaterThan(24);
        expect(label.backgroundIsBehindText).toBe(true);
    });

    test('keeps a larger name clear of the shape', async ({ page }) => {
        await setupBoard(page);
        await addNamedBody(page);
        const smallLabelY = await page.evaluate(() => Number(shell.board.shapes.getByName('Body1').shapeNameText.getAttribute('y')));
        await page.evaluate(() => shell.board.shapes.getByName('Body1').setPropertyCommand('nameFontSize', 48));
        await page.waitForTimeout(250);
        const largeLabelY = await page.evaluate(() => Number(shell.board.shapes.getByName('Body1').shapeNameText.getAttribute('y')));
        expect(largeLabelY).toBeLessThan(smallLabelY);
    });

    test('undoing a name style change restores the previous rendering', async ({ page }) => {
        await setupBoard(page);
        await addNamedBody(page);
        await page.evaluate(() => shell.board.shapes.getByName('Body1').setPropertyCommand('nameFontSize', 32));
        await page.waitForTimeout(250);
        await page.evaluate(() => shell.board.invoker.undo());
        await page.waitForTimeout(250);
        const label = await page.evaluate(readNameLabel(`shell.board.shapes.getByName('Body1')`));
        expect(label.renderedFontSize).toBe('10px');
    });

    test('survives a model round trip', async ({ page }) => {
        await setupBoard(page);
        await addNamedBody(page);
        await page.evaluate(() => {
            const bodyShape = shell.board.shapes.getByName('Body1');
            bodyShape.setPropertyCommand('nameFontSize', 20);
            bodyShape.setPropertyCommand('nameBackgroundColor', '#00FF00');
        });
        await page.waitForTimeout(250);
        const restored = await page.evaluate(() => {
            const model = shell.board.serialize();
            shell.board.deserialize(JSON.parse(JSON.stringify(model)));
            const bodyShape = shell.board.shapes.getByName('Body1');
            return {
                nameFontSize: bodyShape.properties.nameFontSize,
                nameBackgroundColor: bodyShape.properties.nameBackgroundColor,
                fontSize: getComputedStyle(bodyShape.shapeNameText).fontSize
            };
        });
        expect(restored.nameFontSize).toBe(20);
        expect(restored.nameBackgroundColor).toBe('#00FF00');
        expect(restored.fontSize).toBe('20px');
    });

    test('styles the name of a block component shape', async ({ page }) => {
        await setupBoard(page);
        await page.evaluate(() => {
            const shape = shell.commands.addComponent('clock', 'Clock');
            shape.setPropertyCommand('showName', true);
            shape.setPropertyCommand('nameFontSize', 18);
            shape.setPropertyCommand('nameColor', '#0000FF');
            shape.setPropertyCommand('nameBackgroundColor', '#EEEEEE');
        });
        await page.waitForTimeout(400);
        const label = await page.evaluate(readNameLabel(`shell.board.shapes.shapes.find(entry => entry.constructor.name === 'ComponentShape')`));
        expect(label.text).toBe('Clock');
        expect(label.renderedFontSize).toBe('18px');
        expect(label.fill).toBe('#0000FF');
        expect(label.backgroundFill).toBe('#EEEEEE');
        expect(label.backgroundWidth).toBeGreaterThan(0);
    });
});
