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

async function pasteText(page, text) {
    await page.evaluate(value => {
        const clipboardData = new DataTransfer();
        clipboardData.setData('text/plain', value);
        window.dispatchEvent(new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }));
    }, text);
    await page.waitForTimeout(400);
}

async function pasteImage(page) {
    await page.evaluate(() => {
        const pixel = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
        const bytes = Uint8Array.from(atob(pixel), character => character.charCodeAt(0));
        const clipboardData = new DataTransfer();
        clipboardData.items.add(new File([bytes], 'image.png', { type: 'image/png' }));
        window.dispatchEvent(new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }));
    });
    await page.waitForTimeout(600);
}

function shapeNames(page) {
    return page.evaluate(() => shell.board.shapes.shapes.map(shape => shape.constructor.name));
}

test.describe('Clipboard paste on the board', () => {
    test('pasting plain text creates a text shape holding the pasted text', async ({ page }) => {
        await setupEditor(page);
        await pasteText(page, 'Newton second law');

        const state = await page.evaluate(() => {
            const shape = shell.board.shapes.shapes.find(s => s.constructor.name === 'TextShape');
            return { text: shape?.properties.text ?? null, count: shell.board.shapes.shapes.length };
        });

        expect(state.text).toContain('Newton second law');
        expect(state.count).toBe(1);
    });

    test('pasting CSV creates a data table shape loaded with the pasted dataset', async ({ page }) => {
        await setupEditor(page);
        await pasteText(page, 'p,q\n10,1\n20,2\n30,3');

        const state = await page.evaluate(() => {
            const shape = shell.board.shapes.shapes.find(s => s.constructor.name === 'DataTableShape');
            return {
                names: shape?.properties.externalData?.names ?? null,
                values: shape?.properties.externalData?.values ?? null,
                columnTerms: shape ? shape.properties.columns.filter(c => c.term).map(c => c.term) : null
            };
        });

        expect(state.names).toEqual(['p', 'q']);
        expect(state.values).toEqual([[10, 1], [20, 2], [30, 3]]);
        expect(state.columnTerms).toEqual(['p', 'q']);
    });

    test('pasting a CSV file copied from the file manager creates a data table shape', async ({ page }) => {
        await setupEditor(page);
        await page.evaluate(() => {
            const csv = '\uFEFFx,v\n0.4,0\n0.42,0.04\n0.45,0.1';
            const clipboardData = new DataTransfer();
            clipboardData.items.add(new File([csv], 'Car stopped them moving.csv', { type: 'text/csv' }));
            window.dispatchEvent(new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }));
        });
        await page.waitForTimeout(600);

        const state = await page.evaluate(() => {
            const shape = shell.board.shapes.shapes.find(s => s.constructor.name === 'DataTableShape');
            return {
                names: shape?.properties.externalData?.names ?? null,
                values: shape?.properties.externalData?.values ?? null,
                columnTerms: shape ? shape.properties.columns.filter(c => c.term).map(c => c.term) : null
            };
        });

        expect(state.names).toEqual(['x', 'v']);
        expect(state.values).toEqual([[0.4, 0], [0.42, 0.04], [0.45, 0.1]]);
        expect(state.columnTerms).toEqual(['x', 'v']);
    });

    test('pasting a CSV file with no matching mime type is recognized by its extension', async ({ page }) => {
        await setupEditor(page);
        await page.evaluate(() => {
            const clipboardData = new DataTransfer();
            clipboardData.items.add(new File(['a,b\n1,2'], 'readings.CSV', { type: '' }));
            window.dispatchEvent(new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }));
        });
        await page.waitForTimeout(600);

        const names = await page.evaluate(() => {
            const shape = shell.board.shapes.shapes.find(s => s.constructor.name === 'DataTableShape');
            return shape?.properties.externalData?.names ?? null;
        });

        expect(names).toEqual(['a', 'b']);
    });

    test('pasting an image uploads it and creates a media shape', async ({ page }) => {
        await setupEditor(page);
        await page.evaluate(() => {
            window.uploadedAssets = [];
            shell.board.assetManager.uploadAsset = (assetId, file) => {
                window.uploadedAssets.push({ assetId, name: file.name, type: file.type });
                return Promise.resolve('https://assets.test/pasted.png');
            };
        });
        await pasteImage(page);

        const state = await page.evaluate(() => {
            const shape = shell.board.shapes.shapes.find(s => s.constructor.name === 'MediaShape');
            return {
                uploads: window.uploadedAssets,
                shapeId: shape?.id ?? null,
                imageUrl: shape?.properties.imageUrl ?? null,
                videoUrl: shape?.properties.videoUrl ?? null
            };
        });

        expect(state.uploads).toHaveLength(1);
        expect(state.uploads[0].type).toBe('image/png');
        expect(state.imageUrl).toBe('https://assets.test/pasted.png');
        expect(state.videoUrl).toBe('');
        expect(state.uploads[0].assetId).toBe(state.shapeId);
    });

    test('pasting a video uploads it and creates a media shape playing the video', async ({ page }) => {
        await setupEditor(page);
        await page.evaluate(() => {
            shell.board.assetManager.uploadAsset = () => Promise.resolve('data:video/mp4;base64,AAAA');
        });
        await page.evaluate(() => {
            const clipboardData = new DataTransfer();
            clipboardData.items.add(new File([new Uint8Array([0, 0, 0, 0])], 'clip.mp4', { type: 'video/mp4' }));
            window.dispatchEvent(new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }));
        });
        await page.waitForTimeout(600);

        const state = await page.evaluate(() => {
            const shape = shell.board.shapes.shapes.find(s => s.constructor.name === 'MediaShape');
            return { videoUrl: shape?.properties.videoUrl ?? null, imageUrl: shape?.properties.imageUrl ?? null };
        });

        expect(state.videoUrl).toBe('data:video/mp4;base64,AAAA');
        expect(state.imageUrl).toBe('');
    });

    test('pasting copied shape data still recreates that shape instead of a text shape', async ({ page }) => {
        await setupEditor(page);
        await page.evaluate(() => shell.commands.addShape('ValueShape', 'Value1'));
        await page.waitForTimeout(300);
        const clipboardText = await page.evaluate(() => JSON.stringify(shell.board.shapes.getByName('Value1').getClipboardData()));
        await pasteText(page, clipboardText);

        expect(await shapeNames(page)).toEqual(['ValueShape', 'ValueShape']);
    });

    test('pasting the position at the mouse cursor centers the new shape there', async ({ page }) => {
        await setupEditor(page);
        await page.mouse.move(500, 400);
        await page.waitForTimeout(100);
        await pasteText(page, 'placed at the cursor');

        const state = await page.evaluate(() => {
            const shape = shell.board.shapes.shapes.find(s => s.constructor.name === 'TextShape');
            const point = shell.board.getMouseToSvgPoint({ clientX: 500, clientY: 400 });
            return {
                centerX: shape.properties.x + shape.properties.width / 2,
                centerY: shape.properties.y + shape.properties.height / 2,
                pointX: point.x,
                pointY: point.y
            };
        });

        expect(Math.abs(state.centerX - state.pointX)).toBeLessThan(1);
        expect(Math.abs(state.centerY - state.pointY)).toBeLessThan(1);
    });

    test('pasting into a text editor is left to the browser', async ({ page }) => {
        await setupEditor(page);
        await page.evaluate(() => {
            const input = document.createElement('input');
            input.id = 'paste-probe';
            document.body.appendChild(input);
            input.focus();
        });
        await pasteText(page, 'typed into the input');

        expect(await shapeNames(page)).toEqual([]);
    });
});
