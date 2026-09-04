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

// The fade is written on the layers a shape draws in, never on the shape as a whole, so what the
// text card shows is read off the box its content sits in.
async function readTextOpacity(page) {
    return await page.evaluate(() => {
        const textShape = shell.board.shapes.getByName('Text1');
        return {
            property: textShape.properties.opacity,
            shape: textShape.element.style.opacity,
            content: textShape.element.querySelector('foreignObject').style.opacity
        };
    });
}

test('opacity property fades what the shape shows and supports undo', async ({ page }) => {
    await setupEditor(page);
    await setupText(page);

    const defaultOpacity = await readTextOpacity(page);
    expect(defaultOpacity.property).toBe(1);
    expect(defaultOpacity.content).toBe('');

    await page.evaluate(() => {
        const textShape = shell.board.shapes.getByName('Text1');
        textShape.setPropertyCommand('opacity', 0.4);
    });
    const afterSet = await readTextOpacity(page);
    expect(afterSet.property).toBe(0.4);
    expect(afterSet.content).toBe('0.4');
    expect(afterSet.shape).toBe('');

    await page.evaluate(() => shell.board.invoker.undo());
    const afterUndo = await readTextOpacity(page);
    expect(afterUndo.property).toBe(1);
    expect(afterUndo.content).toBe('');
});

test('opacity survives serialize/deserialize round trip', async ({ page }) => {
    await setupEditor(page);
    await setupText(page);

    const roundTrip = await page.evaluate(() => {
        const textShape = shell.board.shapes.getByName('Text1');
        textShape.setPropertyCommand('opacity', 0.25);
        const data = textShape.serialize();
        textShape.remove();
        const restored = BaseShape.deserialize(shell.board, data);
        return { property: restored.properties.opacity, content: restored.element.querySelector('foreignObject').style.opacity };
    });
    expect(roundTrip.property).toBe(0.25);
    expect(roundTrip.content).toBe('0.25');
});

test('a faded card keeps its border and its name at full strength', async ({ page }) => {
    await setupEditor(page);
    await setupText(page);

    const faded = await page.evaluate(() => {
        const textShape = shell.board.shapes.getByName('Text1');
        textShape.properties.showName = true;
        textShape.properties.borderColor = '#ff0000';
        textShape.setPropertyCommand('opacity', 0.3);
        textShape.draw();
        // Everything a shape draws sits under the same group, so what is actually seen on screen is
        // the fade of an element multiplied by the fade of everything above it.
        const drawnOpacity = element => {
            let opacity = 1;
            for (let node = element; node && node !== shell.board.svg; node = node.parentNode)
                opacity *= node.style?.opacity === '' || node.style?.opacity == null ? 1 : Number(node.style.opacity);
            return opacity;
        };
        return {
            border: {
                stroke: textShape.shapeFrameOverlay?.getAttribute('stroke') ?? null,
                width: Number(textShape.shapeFrameOverlay?.getAttribute('width')),
                drawnOpacity: drawnOpacity(textShape.shapeFrameOverlay)
            },
            name: {
                text: textShape.shapeNameText?.textContent ?? null,
                drawnOpacity: drawnOpacity(textShape.shapeNameLayer)
            },
            content: drawnOpacity(textShape.element.querySelector('foreignObject'))
        };
    });

    expect(faded.border.stroke).toBe('#ff0000');
    expect(faded.border.width).toBe(149);
    expect(faded.border.drawnOpacity).toBe(1);
    expect(faded.name.text).not.toBe('');
    expect(faded.name.drawnOpacity).toBe(1);
    expect(faded.content).toBeCloseTo(0.3, 5);
});

test('a name switched on after the shape is faded is still written at full strength', async ({ page }) => {
    await setupEditor(page);
    await setupText(page);

    await page.evaluate(() => {
        const textShape = shell.board.shapes.getByName('Text1');
        textShape.setPropertyCommand('opacity', 0.3);
        textShape.setPropertyCommand('showName', true);
        textShape.draw();
    });
    await page.waitForTimeout(250);

    const name = await page.evaluate(() => {
        const textShape = shell.board.shapes.getByName('Text1');
        const nameText = textShape.shapeNameText;
        let drawn = Number(getComputedStyle(nameText).opacity);
        for (let node = nameText.parentNode; node && node !== shell.board.svg; node = node.parentNode)
            drawn *= Number(getComputedStyle(node).opacity);
        return { text: nameText.textContent, layer: textShape.shapeNameLayer.style.opacity, drawn };
    });

    expect(name.text).not.toBe('');
    expect(name.layer).toBe('');
    expect(name.drawn).toBe(1);
});

test('the opacity slider carries no tooltip', async ({ page }) => {
    await setupEditor(page);
    await setupText(page);

    const colorButton = page.locator('.shape-context-toolbar.visible .mdl-shape-color-selector');
    await colorButton.click();
    const opacityItem = page.locator('.mdl-dropdown-list-item', { hasText: 'Opacity' });
    await expect(opacityItem).toBeVisible();

    const handle = opacityItem.locator('.dx-slider-handle');
    await expect(handle).toBeVisible();
    // The board carries a tooltip of its own on the time slider, so what is checked is that hovering
    // the opacity handle adds none.
    const tooltipsBefore = await page.locator('.dx-tooltip-wrapper').count();
    await handle.hover();
    await page.waitForTimeout(400);
    expect(await page.locator('.dx-tooltip-wrapper').count()).toBe(tooltipsBefore);

    const tooltipEnabled = await page.evaluate(() => shell.board.shapes.getByName('Text1')._opacitySliderInstance?.option('tooltip.enabled') ?? null);
    expect(tooltipEnabled).toBe(false);
});

test('a faded shape with a drawn border fades its fill and keeps its stroke', async ({ page }) => {
    await setupEditor(page);
    await page.evaluate(() => {
        modellus.shape.addPoint('Point1');
        const point = shell.board.shapes.getByName('Point1');
        point.setPropertyCommand('opacity', 0.4);
        point.draw();
    });
    await page.waitForTimeout(250);

    const point = await page.evaluate(() => {
        const shape = shell.board.shapes.getByName('Point1');
        const circle = shape.element.querySelector('circle');
        return {
            shape: shape.element.style.opacity,
            circleOpacity: circle.style.opacity,
            circleFillOpacity: circle.style.fillOpacity,
            stroke: circle.getAttribute('stroke')
        };
    });

    expect(point.shape).toBe('');
    expect(point.circleOpacity).toBe('');
    expect(point.circleFillOpacity).toBe('0.4');
    expect(point.stroke).not.toBe('none');
});

test('a referential fades everything standing in it, borders and names included', async ({ page }) => {
    await setupEditor(page);
    await page.evaluate(() => {
        modellus.shape.addReferential('Ref1');
        modellus.shape.addBody('Body1', 'Ref1');
        const body = shell.board.shapes.getByName('Body1');
        body.properties.showName = true;
        body.draw();
    });
    await page.waitForTimeout(250);

    const read = () => page.evaluate(() => {
        const body = shell.board.shapes.getByName('Body1');
        return {
            body: body.element.style.opacity,
            trail: body.motionGroup?.style.opacity ?? null,
            fill: body.circle.style.fillOpacity,
            nameInsideBody: body.shapeNameLayer?.parentNode === body.element
        };
    });

    await page.evaluate(() => shell.board.shapes.getByName('Ref1').setPropertyCommand('opacity', 0.5));
    const faded = await read();
    // The fade of the referential is written on the body as a whole, so it reaches the border it is
    // drawn with and the name written above it.
    expect(faded.body).toBe('0.5');
    expect(faded.nameInsideBody).toBe(true);
    expect(faded.trail).toBe('0.5');

    await page.evaluate(() => shell.board.shapes.getByName('Body1').setPropertyCommand('opacity', 0.4));
    const both = await read();
    expect(both.body).toBe('0.5');
    expect(both.fill).toBe('0.4');
    expect(both.trail).toBe('0.2');

    await page.evaluate(() => shell.board.shapes.getByName('Ref1').setPropertyCommand('opacity', 0));
    const invisible = await read();
    expect(invisible.body).toBe('0');
    expect(invisible.trail).toBe('0');

    await page.evaluate(() => shell.board.shapes.getByName('Ref1').setPropertyCommand('opacity', 1));
    const restored = await read();
    expect(restored.body).toBe('');
    expect(restored.fill).toBe('0.4');
});

test('a shape the referential has faded away is selected without a selection being drawn', async ({ page }) => {
    await setupEditor(page);
    await page.evaluate(() => {
        modellus.shape.addReferential('Ref1');
        modellus.shape.addBody('Body1', 'Ref1');
    });
    await page.waitForTimeout(250);

    const read = () => page.evaluate(() => {
        const body = shell.board.shapes.getByName('Body1');
        return {
            outline: body._highlightProxy != null,
            handles: (body.handleElements ?? []).every(handle => handle.getAttribute('visibility') === 'hidden'),
            hiddenByAncestor: body.isHiddenByAncestor()
        };
    });

    await page.evaluate(() => shell.board.selection.select(shell.board.shapes.getByName('Body1')));
    expect((await read()).outline).toBe(true);

    // The referential is faded away while the body is selected, so the outline has to go on its own.
    await page.evaluate(() => shell.board.shapes.getByName('Ref1').setPropertyCommand('opacity', 0));
    const hidden = await read();
    expect(hidden.hiddenByAncestor).toBe(true);
    expect(hidden.outline).toBe(false);
    expect(hidden.handles).toBe(true);

    await page.evaluate(() => shell.board.shapes.getByName('Ref1').setPropertyCommand('opacity', 1));
    expect((await read()).outline).toBe(true);

    await page.evaluate(() => {
        shell.board.shapes.getByName('Ref1').setPropertyCommand('opacity', 0);
        shell.board.selection.deselect();
        shell.board.selection.select(shell.board.shapes.getByName('Body1'));
    });
    expect((await read()).outline).toBe(false);

    await page.evaluate(() => {
        shell.board.selection.deselect();
        shell.board.selection.setHover(shell.board.shapes.getByName('Body1'));
    });
    expect((await read()).outline).toBe(false);

    // A referential that is merely faded still shows the selection of what stands in it.
    await page.evaluate(() => {
        shell.board.shapes.getByName('Ref1').setPropertyCommand('opacity', 0.5);
        shell.board.selection.select(shell.board.shapes.getByName('Body1'));
    });
    expect((await read()).outline).toBe(true);
});

test('shape dropdown shows opacity slider that changes the shape', async ({ page }) => {
    await setupEditor(page);
    await setupText(page);

    const colorButton = page.locator('.shape-context-toolbar.visible .mdl-shape-color-selector');
    await expect(colorButton).toBeVisible();
    await colorButton.click();
    await page.waitForTimeout(500);

    const opacityItem = page.locator('.mdl-dropdown-list-item', { hasText: 'Opacity' });
    await expect(opacityItem).toBeVisible();

    const handle = opacityItem.locator('.dx-slider-handle');
    await expect(handle).toBeVisible();

    const sliderBox = await opacityItem.locator('.mdl-opacity-slider').boundingBox();
    const handleBox = await handle.boundingBox();
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(sliderBox.x + sliderBox.width / 2, handleBox.y + handleBox.height / 2, { steps: 8 });

    const duringDrag = await readTextOpacity(page);
    expect(duringDrag.property).toBe(1);
    expect(parseFloat(duringDrag.content)).toBeGreaterThan(0);
    expect(parseFloat(duringDrag.content)).toBeLessThan(1);

    await page.mouse.up();
    await page.waitForTimeout(700);

    const result = await readTextOpacity(page);
    expect(result.property).toBeGreaterThan(0);
    expect(result.property).toBeLessThan(1);
    expect(result.content).toBe(String(result.property));
});
