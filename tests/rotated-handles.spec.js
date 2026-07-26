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

async function setupRotatedText(page, rotation) {
    await page.evaluate(value => {
        modellus.shape.addText('Text1');
        const textShape = shell.board.shapes.getByName('Text1');
        textShape.properties.x = 200;
        textShape.properties.y = 200;
        textShape.properties.width = 150;
        textShape.properties.height = 80;
        textShape.properties.rotation = value;
        textShape.update();
        textShape.draw();
        shell.board.selection.select(textShape);
    }, rotation);
    await page.waitForTimeout(250);
}

async function getShapeBox(page) {
    return page.evaluate(() => {
        const textShape = shell.board.shapes.getByName('Text1');
        return {
            x: textShape.properties.x,
            y: textShape.properties.y,
            width: textShape.properties.width,
            height: textShape.properties.height,
            rotation: textShape.properties.rotation
        };
    });
}

// Read the rendered box, not the x/y attributes: the handle carries a rotate
// transform, so the attributes alone no longer give its on-screen position.
async function getRotationHandleScreenCenter(page) {
    return page.evaluate(() => {
        const rect = shell.board.svg.querySelector('.handle.rotation').getBoundingClientRect();
        return { clientX: rect.x + rect.width / 2, clientY: rect.y + rect.height / 2 };
    });
}

async function getShapeCenterScreen(page) {
    return page.evaluate(() => {
        const textShape = shell.board.shapes.getByName('Text1');
        const center = textShape.getShapeCenter();
        const point = new DOMPoint(center.x, center.y).matrixTransform(shell.board.svg.getScreenCTM());
        return { clientX: point.x, clientY: point.y };
    });
}

async function rotateShape(page, rotation) {
    await page.evaluate(value => {
        const textShape = shell.board.shapes.getByName('Text1');
        textShape.setProperty('rotation', value);
        textShape.updateHandles();
    }, rotation);
}

test.describe('Handles on rotated shapes', () => {
    test('rotation handle keeps a constant distance from the shape center at every angle', async ({ page }) => {
        await setupEditor(page);
        await setupRotatedText(page, 0);

        const distances = [];
        for (const rotation of [0, 45, 90, 180, 270]) {
            await rotateShape(page, rotation);
            const handle = await getRotationHandleScreenCenter(page);
            const center = await getShapeCenterScreen(page);
            distances.push(Math.hypot(handle.clientX - center.clientX, handle.clientY - center.clientY));
        }
        for (const distance of distances)
            expect(distance).toBeCloseTo(distances[0], 0);
    });

    test('grabbing the rotation handle of a rotated shape does not snap the rotation back', async ({ page }) => {
        await setupEditor(page);
        await setupRotatedText(page, 180);

        const handle = await getRotationHandleScreenCenter(page);
        await page.mouse.move(handle.clientX, handle.clientY);
        await page.mouse.down();
        await page.mouse.move(handle.clientX + 8, handle.clientY, { steps: 5 });
        await page.mouse.up();
        await page.waitForTimeout(250);

        const box = await getShapeBox(page);
        const distanceFrom180 = Math.abs(((box.rotation - 180) % 360 + 540) % 360 - 180);
        expect(distanceFrom180).toBeLessThan(20);
    });

    for (const rotation of [90, 180, 270]) {
        test(`rotation handle rides with the shape at ${rotation} degrees`, async ({ page }) => {
            await setupEditor(page);
            await setupRotatedText(page, 0);

            const before = await getRotationHandleScreenCenter(page);
            const center = await getShapeCenterScreen(page);
            await rotateShape(page, rotation);
            const after = await getRotationHandleScreenCenter(page);

            // The handle is rigidly attached: its position after rotating is the
            // 0-degree position turned about the shape center by the same angle.
            const radians = rotation * Math.PI / 180;
            const offsetX = before.clientX - center.clientX;
            const offsetY = before.clientY - center.clientY;
            expect(after.clientX).toBeCloseTo(center.clientX + offsetX * Math.cos(radians) - offsetY * Math.sin(radians), 0);
            expect(after.clientY).toBeCloseTo(center.clientY + offsetX * Math.sin(radians) + offsetY * Math.cos(radians), 0);

            const cursors = await page.evaluate(() => ({
                topLeft: getComputedStyle(shell.board.svg.querySelector('.handle.top-left')).cursor,
                topRight: getComputedStyle(shell.board.svg.querySelector('.handle.top-right')).cursor
            }));
            const diagonalsSwap = rotation !== 180;
            expect(cursors.topLeft).toContain('data:image/svg+xml');
            expect(cursors.topLeft).toContain(diagonalsSwap ? 'nesw-resize' : 'nwse-resize');
            expect(cursors.topRight).toContain('data:image/svg+xml');
            expect(cursors.topRight).toContain(diagonalsSwap ? 'nwse-resize' : 'nesw-resize');
        });
    }

    test('slider value handles use the app cursor angled to the rotated drag axis', async ({ page }) => {
        await setupEditor(page);
        const cursors = await page.evaluate(() => {
            shell.commands.addShape('SliderShape', 'Slider1');
            const slider = shell.board.shapes.getByName('Slider1');
            const read = () => {
                slider.update();
                slider.draw();
                shell.board.selection.select(slider);
                return {
                    splitter: getComputedStyle(shell.board.svg.querySelector('.handle.splitter')).cursor,
                    tick: getComputedStyle(slider.tickInteractionLayer.children[0]).cursor
                };
            };
            slider.properties.rotation = 0;
            const upright = read();
            slider.properties.rotation = 90;
            const rotated = read();
            return { upright, rotated };
        });
        // The slider drags along its own vertical axis: vertical arrow upright,
        // horizontal once the shape is turned a quarter turn — never the plain
        // system cursor.
        for (const cursor of [cursors.upright.splitter, cursors.upright.tick])
            expect(cursor).toContain('data:image/svg+xml');
        expect(cursors.upright.splitter).toContain('ns-resize');
        expect(cursors.upright.tick).toContain('ns-resize');
        expect(cursors.rotated.splitter).toContain('data:image/svg+xml');
        expect(cursors.rotated.splitter).toContain('ew-resize');
        expect(cursors.rotated.tick).toContain('ew-resize');
    });

    test('ruler tick handles use the app cursor angled to the rotated drag axis', async ({ page }) => {
        await setupEditor(page);
        const cursors = await page.evaluate(() => {
            shell.commands.addShape('RulerShape', 'Ruler1');
            const ruler = shell.board.shapes.getByName('Ruler1');
            const read = () => {
                ruler.update();
                ruler.draw();
                return getComputedStyle(ruler.tickInteractionLayer.children[0]).cursor;
            };
            ruler.properties.rotation = 0;
            const upright = read();
            ruler.properties.rotation = 90;
            const rotated = read();
            return { upright, rotated };
        });
        // The ruler rescales along its own horizontal axis, so the arrow lies
        // flat upright and stands vertical after a quarter turn.
        expect(cursors.upright).toContain('data:image/svg+xml');
        expect(cursors.upright).toContain('ew-resize');
        expect(cursors.rotated).toContain('data:image/svg+xml');
        expect(cursors.rotated).toContain('ns-resize');
    });

    test('slider splitter drag of a 90-degree rotated slider follows the rotated axis', async ({ page }) => {
        await setupEditor(page);
        await page.evaluate(() => {
            shell.commands.addShape('SliderShape', 'Slider1');
            const slider = shell.board.shapes.getByName('Slider1');
            // Unbound from a term the value lands on the shape itself, which
            // keeps the assertions independent of the calculator.
            slider.properties.term = '';
            slider.properties.rotation = 90;
            slider.update();
            slider.draw();
            shell.board.selection.select(slider);
        });
        await page.waitForTimeout(250);

        const dragSplitter = async (dx, dy) => {
            const start = await page.evaluate(() => {
                const rect = shell.board.svg.querySelector('.handle.splitter').getBoundingClientRect();
                return {
                    clientX: rect.x + rect.width / 2,
                    clientY: rect.y + rect.height / 2,
                    value: shell.board.shapes.getByName('Slider1').properties.value
                };
            });
            await page.mouse.move(start.clientX, start.clientY);
            await page.mouse.down();
            await page.mouse.move(start.clientX + dx, start.clientY + dy, { steps: 10 });
            await page.mouse.up();
            await page.waitForTimeout(250);
            const end = await page.evaluate(() => shell.board.shapes.getByName('Slider1').properties.value);
            return { before: start.value, after: end };
        };

        // At 90 degrees the slider's value axis lies along the screen x axis, so
        // a horizontal drag must move the value and a vertical one must not.
        const across = await dragSplitter(40, 0);
        expect(across.before).toBe(0);
        expect(across.after).toBeGreaterThan(0.5);
        const along = await dragSplitter(0, 40);
        expect(along.after).toBeCloseTo(along.before, 3);
    });

    test('corner resize of a 90-degree rotated shape follows the pointer', async ({ page }) => {
        await setupEditor(page);
        await setupRotatedText(page, 90);

        const getRenderedBox = () => page.evaluate(() => {
            const textShape = shell.board.shapes.getByName('Text1');
            const position = textShape.getBoardPosition();
            const width = textShape.properties.width;
            const height = textShape.properties.height;
            const radians = textShape.properties.rotation * Math.PI / 180;
            const halfWidth = (Math.abs(width * Math.cos(radians)) + Math.abs(height * Math.sin(radians))) / 2;
            const halfHeight = (Math.abs(width * Math.sin(radians)) + Math.abs(height * Math.cos(radians))) / 2;
            const centerX = position.x + width / 2;
            const centerY = position.y + height / 2;
            return { left: centerX - halfWidth, top: centerY - halfHeight, width: halfWidth * 2, height: halfHeight * 2 };
        });

        const initialBox = await getRenderedBox();
        const corner = await page.evaluate(() => {
            const textShape = shell.board.shapes.getByName('Text1');
            const center = textShape.getShapeCenter();
            const halfWidth = textShape.properties.height / 2;
            const halfHeight = textShape.properties.width / 2;
            const ctm = shell.board.svg.getScreenCTM();
            const clientPoint = new DOMPoint(center.x + halfWidth, center.y + halfHeight).matrixTransform(ctm);
            return { clientX: clientPoint.x, clientY: clientPoint.y };
        });
        await page.mouse.move(corner.clientX, corner.clientY);
        await page.mouse.down();
        await page.mouse.move(corner.clientX + 30, corner.clientY + 20, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(250);

        const resizedBox = await getRenderedBox();
        expect(resizedBox.width).toBeCloseTo(initialBox.width + 30, 0);
        expect(resizedBox.height).toBeCloseTo(initialBox.height + 20, 0);
        expect(resizedBox.left).toBeCloseTo(initialBox.left, 0);
        expect(resizedBox.top).toBeCloseTo(initialBox.top, 0);
    });

    test('origin drag of a 90-degree rotated referential lands where the pointer is', async ({ page }) => {
        await setupEditor(page);
        await page.evaluate(() => {
            modellus.shape.addReferential('Referential1');
            const referential = shell.board.shapes.getByName('Referential1');
            referential.properties.rotation = 90;
            referential.update();
            referential.draw();
            shell.board.selection.select(referential);
        });
        await page.waitForTimeout(250);

        const initial = await page.evaluate(() => {
            const referential = shell.board.shapes.getByName('Referential1');
            const handle = shell.board.svg.querySelector('.handle.origin');
            const rect = handle.getBoundingClientRect();
            return {
                originX: referential.properties.originX,
                originY: referential.properties.originY,
                clientX: rect.x + rect.width / 2,
                clientY: rect.y + rect.height / 2
            };
        });
        await page.mouse.move(initial.clientX, initial.clientY);
        await page.mouse.down();
        await page.mouse.move(initial.clientX + 40, initial.clientY, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(250);

        const moved = await page.evaluate(() => {
            const referential = shell.board.shapes.getByName('Referential1');
            return { originX: referential.properties.originX, originY: referential.properties.originY };
        });
        // At 90 degrees a screen-space move to the right shifts the origin along
        // the referential's local -y direction.
        expect(moved.originY).toBeCloseTo(initial.originY - 40, 0);
        expect(moved.originX).toBeCloseTo(initial.originX, 0);
    });

    test('tick value drag of a 90-degree rotated referential rescales the axis', async ({ page }) => {
        await setupEditor(page);
        await page.evaluate(() => {
            modellus.shape.addReferential('Referential1');
            const referential = shell.board.shapes.getByName('Referential1');
            referential.properties.rotation = 90;
            referential.properties.autoScale = false;
            referential.update();
            referential.draw();
        });
        await page.waitForTimeout(250);

        const initial = await page.evaluate(() => {
            const referential = shell.board.shapes.getByName('Referential1');
            const handles = Array.from(referential.tickInteractionLayer.querySelectorAll('.chart-tick-handle-x'));
            const handle = handles.reduce((closest, candidate) =>
                Math.abs(Number(candidate.dataset.value)) < Math.abs(Number(closest.dataset.value)) ? candidate : closest);
            const rect = handle.getBoundingClientRect();
            return {
                scaleX: referential.properties.scaleX,
                tickValue: Number(handle.dataset.value),
                clientX: rect.x + rect.width / 2,
                clientY: rect.y + rect.height / 2,
                cursor: getComputedStyle(handle).cursor
            };
        });
        // The x axis renders vertically at 90 degrees, so its tick handles must
        // use a vertical resize cursor and respond to vertical drags.
        expect(initial.cursor).toContain('data:image/svg+xml');
        expect(initial.cursor).toContain('ns-resize');
        await page.mouse.move(initial.clientX, initial.clientY);
        await page.mouse.down();
        const direction = initial.tickValue > 0 ? 1 : -1;
        await page.mouse.move(initial.clientX, initial.clientY + direction * 40, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(250);

        const moved = await page.evaluate(() => {
            const referential = shell.board.shapes.getByName('Referential1');
            return { scaleX: referential.properties.scaleX };
        });
        expect(moved.scaleX).not.toBeCloseTo(initial.scaleX, 5);
        expect(moved.scaleX).toBeGreaterThan(0);
    });

    test('corner resize of a 180-degree rotated shape follows the pointer', async ({ page }) => {
        await setupEditor(page);
        await setupRotatedText(page, 180);

        const initialBox = await getShapeBox(page);
        const corner = await page.evaluate(() => {
            const textShape = shell.board.shapes.getByName('Text1');
            const position = textShape.getBoardPosition();
            const ctm = shell.board.svg.getScreenCTM();
            const clientPoint = new DOMPoint(position.x + textShape.properties.width, position.y + textShape.properties.height).matrixTransform(ctm);
            return { clientX: clientPoint.x, clientY: clientPoint.y };
        });
        await page.mouse.move(corner.clientX, corner.clientY);
        await page.mouse.down();
        await page.mouse.move(corner.clientX + 30, corner.clientY + 20, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(250);

        const resizedBox = await getShapeBox(page);
        expect(resizedBox.width).toBeCloseTo(initialBox.width + 30, 0);
        expect(resizedBox.height).toBeCloseTo(initialBox.height + 20, 0);
        expect(resizedBox.x).toBeCloseTo(initialBox.x, 0);
        expect(resizedBox.y).toBeCloseTo(initialBox.y, 0);
    });
});
