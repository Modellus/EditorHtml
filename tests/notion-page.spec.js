const { test, expect } = require('@playwright/test');

const EDITOR_URL = '/pages/board/index.html';
const PAGE_ID = '917e3b02e71a4b10a0ae8bcf563a43e2';
const SHARE_URL = `https://vdt.notion.site/Oscilosc-pios-princ-pios-caracter-sticas-utiliza-o-e-medi-es-${PAGE_ID}?source=copy_link`;
const EMBED_URL = `https://vdt.notion.site/ebd/${PAGE_ID}`;

async function setupEditor(page) {
    await page.route('**://*.notion.site/**', route => route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<!doctype html><title>Notion</title><body style="margin:0"><div style="height:4000px">stubbed notion page</div></body>'
    }));
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
        navigator.clipboard.read = async () => [];
    });
    await page.goto(EDITOR_URL);
    await page.waitForFunction(() => typeof shell !== 'undefined' && shell !== null && shell.board !== null, null, { timeout: 15000 });
}

async function pasteText(page, text) {
    await page.evaluate(value => {
        const clipboardData = new DataTransfer();
        clipboardData.setData('text/plain', value);
        window.dispatchEvent(new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }));
    }, text);
}

async function dragFromBorder(page, deltaX, deltaY) {
    const start = await page.evaluate(() => {
        const rect = shell.board.shapes.shapes[0]._mediaOverlayDiv.getBoundingClientRect();
        return { x: rect.x + rect.width / 2, y: rect.y + 5 };
    });
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    for (let step = 1; step <= 20; step++)
        await page.mouse.move(start.x + deltaX * step / 20, start.y + deltaY * step / 20);
    await page.mouse.up();
}

test.describe('Notion pages pasted onto the board', () => {
    test('pasting a published page link creates a media shape showing it, as a video link does', async ({ page }) => {
        await setupEditor(page);
        await pasteText(page, SHARE_URL);

        await expect.poll(() => page.evaluate(() => shell.board.shapes.shapes.length)).toBe(1);
        const state = await page.evaluate(() => {
            const shape = shell.board.shapes.shapes[0];
            return {
                type: shape.constructor.name,
                name: shape.properties.name,
                embedUrl: shape.properties.embedUrl,
                width: shape.properties.width,
                height: shape.properties.height,
                frameSrc: shape._overlayFrameElement.getAttribute('src'),
                frameVisible: shape._overlayFrameElement.style.display,
                imageDisplay: shape.image.getAttribute('display')
            };
        });

        expect(state.type).toBe('MediaShape');
        expect(state.name).toBe('Media');
        expect(state.embedUrl).toBe(EMBED_URL);
        expect(state.frameSrc).toBe(EMBED_URL);
        expect(state.frameVisible).toBe('block');
        expect(state.imageDisplay).toBe('none');
    });

    test('a page is laid out upright, where a video keeps the widescreen shape', async ({ page }) => {
        await setupEditor(page);
        await pasteText(page, SHARE_URL);
        await expect.poll(() => page.evaluate(() => shell.board.shapes.shapes.length)).toBe(1);
        const notionSize = await page.evaluate(() => {
            const shape = shell.board.shapes.shapes[0];
            return { width: shape.properties.width, height: shape.properties.height };
        });

        await pasteText(page, 'https://youtu.be/00BL4t4azJc');
        await expect.poll(() => page.evaluate(() => shell.board.shapes.shapes.length)).toBe(2);
        const videoSize = await page.evaluate(() => {
            const shape = shell.board.shapes.shapes[1];
            return { width: shape.properties.width, height: shape.properties.height };
        });

        expect(notionSize.height).toBeGreaterThan(notionSize.width);
        expect(videoSize.width).toBeGreaterThan(videoSize.height);
    });

    test('a page published under a custom slug, with no id in the link, embeds too', async ({ page }) => {
        await setupEditor(page);
        await pasteText(page, 'https://modellus.notion.site/lunar-lander');

        await expect.poll(() => page.evaluate(() => shell.board.shapes.shapes.length)).toBe(1);
        const state = await page.evaluate(() => {
            const shape = shell.board.shapes.shapes[0];
            return {
                type: shape.constructor.name,
                embedUrl: shape.properties.embedUrl,
                frameSrc: shape._overlayFrameElement.getAttribute('src')
            };
        });

        expect(state.type).toBe('MediaShape');
        expect(state.embedUrl).toBe('https://modellus.notion.site/ebd/lunar-lander');
        expect(state.frameSrc).toBe('https://modellus.notion.site/ebd/lunar-lander');
    });

    test('the media settings carry a link field that sets the embed and clears the picture', async ({ page }) => {
        await setupEditor(page);
        await page.evaluate(() => {
            const shape = shell.board.createShape('MediaShape', null);
            shape.setProperties({ name: 'Media', x: 40, y: 40, width: 400, height: 300, imageUrl: 'https://example.test/photo.png' });
            shell.board.addShape(shape, false);
            window.__shape = shape;
        });

        await page.evaluate(() => shell.board.selection.select(shell.board.shapes.getByName('Media')));
        await page.locator('.shape-context-toolbar.visible .mdl-image-settings-selector').click();

        const row = page.locator('.mdl-shape-overlay-popup .mdl-dropdown-list-item', { hasText: 'Link' }).first();
        await expect(row.locator('.dx-textbox')).toBeVisible();

        await page.evaluate(() => {
            const item = Array.from(document.querySelectorAll('.mdl-shape-overlay-popup .mdl-dropdown-list-item'))
                .find(element => element.querySelector('.mdl-dropdown-list-label')?.textContent === 'Link');
            DevExpress.ui.dxTextBox.getInstance(item.querySelector('.dx-textbox')).option('value', 'https://modellus.notion.site/lunar-lander');
        });

        await expect.poll(() => page.evaluate(() => window.__shape.properties.embedUrl))
            .toBe('https://modellus.notion.site/ebd/lunar-lander');
        expect(await page.evaluate(() => window.__shape.properties.imageUrl)).toBe('');
    });

    test('the link field takes a video link just as well, and refuses what embeds nowhere', async ({ page }) => {
        await setupEditor(page);
        await page.evaluate(() => {
            const shape = shell.board.createShape('MediaShape', null);
            shape.setProperties({ name: 'Media', x: 40, y: 40, width: 400, height: 300 });
            shell.board.addShape(shape, false);
            window.__shape = shape;
        });

        await page.evaluate(() => window.__shape.applyEmbedLink('https://youtu.be/00BL4t4azJc'));
        expect(await page.evaluate(() => window.__shape.properties.embedUrl)).toBe('https://www.youtube.com/embed/00BL4t4azJc');

        await page.evaluate(() => window.__shape.applyEmbedLink('https://example.test/nothing'));
        expect(await page.evaluate(() => window.__shape.properties.embedUrl)).toBe('https://www.youtube.com/embed/00BL4t4azJc');

        await page.evaluate(() => window.__shape.applyEmbedLink(''));
        expect(await page.evaluate(() => window.__shape.properties.embedUrl)).toBe('');
    });

    test('the notebook media block, which has no frame to show a page in, is not offered the field', async ({ page }) => {
        await page.goto('/pages/notebook/index.html');
        await page.waitForFunction(() => window.__shapeToolbarBindingsApplied === true, null, { timeout: 15000 });

        const offered = await page.evaluate(() => ({
            hasMixin: typeof MediaNotebookShape.prototype.buildMediaSettingsMenuContent === 'function',
            canApply: MediaNotebookShape.prototype.applyEmbedLink !== undefined
        }));

        expect(offered.hasMixin).toBe(true);
        expect(offered.canApply).toBe(false);
    });

    test('the wheel scrolls the embedded page, and does not select the shape to do it', async ({ page }) => {
        await setupEditor(page);
        await pasteText(page, SHARE_URL);
        await expect.poll(() => page.evaluate(() => shell.board.shapes.shapes.length)).toBe(1);
        await page.evaluate(() => shell.board.selection.deselect());

        const frame = page.frameLocator('iframe[src*="notion.site"]');
        await expect(frame.locator('div')).toBeVisible();
        const box = await page.evaluate(() => {
            const rect = shell.board.shapes.shapes[0]._mediaOverlayDiv.getBoundingClientRect();
            return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
        });

        await page.mouse.move(box.x, box.y);
        await page.mouse.wheel(0, 600);

        const scrolled = () => page.frames().find(f => f.url().includes('notion.site'))
            .evaluate(() => document.scrollingElement.scrollTop);
        await expect.poll(scrolled).toBeGreaterThan(0);
        expect(await page.evaluate(() => shell.board.selection.selectedShape)).toBe(null);
    });

    test('moving the shape keeps the page where it was, without reloading it', async ({ page }) => {
        await setupEditor(page);
        await pasteText(page, SHARE_URL);
        await expect.poll(() => page.evaluate(() => shell.board.shapes.shapes.length)).toBe(1);

        const frame = () => page.frames().find(f => f.url().includes('notion.site'));
        await expect(page.frameLocator('iframe[src*="notion.site"]').locator('div')).toBeVisible();
        await page.evaluate(() => {
            const shape = shell.board.shapes.shapes[0];
            window.__loads = 0;
            shape._overlayFrameElement.addEventListener('load', () => window.__loads++);
        });
        await frame().evaluate(() => document.scrollingElement.scrollTop = 800);
        await expect.poll(() => frame().evaluate(() => document.scrollingElement.scrollTop)).toBe(800);

        await dragFromBorder(page, -160, 80);

        const state = await page.evaluate(() => ({
            loads: window.__loads,
            x: Math.round(shell.board.shapes.shapes[0].properties.x)
        }));
        expect(state.x).toBeLessThan(420);
        expect(state.loads).toBe(0);
        expect(await frame().evaluate(() => document.scrollingElement.scrollTop)).toBe(800);
    });

    test('the border band drags the shape whether or not it is already selected', async ({ page }) => {
        await setupEditor(page);
        await pasteText(page, SHARE_URL);
        await expect.poll(() => page.evaluate(() => shell.board.shapes.shapes.length)).toBe(1);
        await expect(page.frameLocator('iframe[src*="notion.site"]').locator('div')).toBeVisible();

        await page.evaluate(() => shell.board.selection.deselect());
        await dragFromBorder(page, -120, 60);
        const afterFirst = await page.evaluate(() => ({
            x: Math.round(shell.board.shapes.shapes[0].properties.x),
            selected: shell.board.selection.selectedShape?.properties.name ?? null
        }));
        expect(afterFirst.x).toBeLessThan(420);

        await page.evaluate(() => shell.board.selection.select(shell.board.shapes.shapes[0]));
        await dragFromBorder(page, -100, 40);
        const afterSecond = await page.evaluate(() => Math.round(shell.board.shapes.shapes[0].properties.x));
        expect(afterSecond).toBeLessThan(afterFirst.x);
    });

    test('the page runs to its border, with a grab margin around it', async ({ page }) => {
        await setupEditor(page);
        await pasteText(page, SHARE_URL);
        await expect.poll(() => page.evaluate(() => shell.board.shapes.shapes.length)).toBe(1);

        const geometry = await page.evaluate(() => {
            const shape = shell.board.shapes.shapes[0];
            const overlay = shape._mediaOverlayDiv.getBoundingClientRect();
            const frame = shape._overlayFrameElement.getBoundingClientRect();
            const border = shape.border.getBoundingClientRect();
            return {
                margin: Math.round(frame.x - overlay.x),
                marginBottom: Math.round(overlay.bottom - frame.bottom),
                borderGapLeft: Math.round(frame.x - border.x),
                borderGapTop: Math.round(frame.y - border.y),
                borderGapRight: Math.round(border.right - frame.right),
                borderGapBottom: Math.round(border.bottom - frame.bottom),
                overlayEvents: getComputedStyle(shape._mediaOverlayDiv).pointerEvents,
                frameEvents: getComputedStyle(shape._overlayFrameElement).pointerEvents
            };
        });

        expect(geometry.margin).toBe(12);
        expect(geometry.marginBottom).toBe(12);
        expect(geometry.borderGapLeft).toBe(0);
        expect(geometry.borderGapTop).toBe(0);
        expect(geometry.borderGapRight).toBe(0);
        expect(geometry.borderGapBottom).toBe(0);
        expect(geometry.overlayEvents).toBe('none');
        expect(geometry.frameEvents).toBe('auto');

        const hits = await page.evaluate(() => {
            const overlay = shell.board.shapes.shapes[0]._mediaOverlayDiv.getBoundingClientRect();
            const nameAt = (x, y) => document.elementFromPoint(x, y)?.tagName ?? 'none';
            return {
                topMargin: nameAt(overlay.x + overlay.width / 2, overlay.y + 5),
                leftMargin: nameAt(overlay.x + 5, overlay.y + overlay.height / 2),
                interior: nameAt(overlay.x + overlay.width / 2, overlay.y + overlay.height / 2)
            };
        });

        expect(hits.topMargin).toBe('rect');
        expect(hits.leftMargin).toBe('rect');
        expect(hits.interior).toBe('IFRAME');
    });

    test('the resize handles sit on the visible corners, not out at the grab margin', async ({ page }) => {
        await setupEditor(page);
        await pasteText(page, SHARE_URL);
        await expect.poll(() => page.evaluate(() => shell.board.shapes.shapes.length)).toBe(1);
        await page.evaluate(() => shell.board.selection.select(shell.board.shapes.shapes[0]));

        const placement = await page.evaluate(() => {
            const shape = shell.board.shapes.shapes[0];
            const border = shape.border.getBoundingClientRect();
            const overlay = shape._mediaOverlayDiv.getBoundingClientRect();
            const handle = shape.handleElements.find(element => (element.getAttribute('class') ?? '').includes('top-left'));
            const box = handle.getBoundingClientRect();
            const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
            return {
                fromBorderCorner: Math.round(Math.hypot(centre.x - border.x, centre.y - border.y)),
                fromShapeCorner: Math.round(Math.hypot(centre.x - overlay.x, centre.y - overlay.y)),
                under: (element => `${element.tagName}.${element.getAttribute('class') ?? ''}`)(document.elementFromPoint(centre.x, centre.y))
            };
        });

        expect(placement.fromBorderCorner).toBeLessThan(placement.fromShapeCorner);
        expect(placement.fromBorderCorner).toBeLessThanOrEqual(6);
        expect(placement.under).toBe('circle.handle top-left');

        const before = await page.evaluate(() => Math.round(shell.board.shapes.shapes[0].properties.width));
        const dot = await page.evaluate(() => {
            const handle = shell.board.shapes.shapes[0].handleElements.find(element => (element.getAttribute('class') ?? '').includes('top-left'));
            const box = handle.getBoundingClientRect();
            return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
        });
        await page.mouse.move(dot.x, dot.y);
        await page.mouse.down();
        for (let step = 1; step <= 10; step++)
            await page.mouse.move(dot.x + step * 5, dot.y + step * 5);
        await page.mouse.up();

        expect(await page.evaluate(() => Math.round(shell.board.shapes.shapes[0].properties.width))).toBeLessThan(before);
    });

    test('selecting the shape draws no second border around the grab margin', async ({ page }) => {
        await setupEditor(page);
        await pasteText(page, SHARE_URL);
        await expect.poll(() => page.evaluate(() => shell.board.shapes.shapes.length)).toBe(1);

        const strokedRects = () => page.evaluate(() => [...document.querySelectorAll('svg rect')]
            .filter(element => {
                const style = getComputedStyle(element);
                return style.stroke !== 'none' && element.getAttribute('visibility') !== 'hidden'
                    && element.getBoundingClientRect().width > 100;
            })
            .map(element => Math.round(element.getBoundingClientRect().width)));

        await page.evaluate(() => shell.board.selection.deselect());
        const deselected = await strokedRects();
        await page.evaluate(() => shell.board.selection.select(shell.board.shapes.shapes[0]));
        const selected = await strokedRects();

        expect(new Set(deselected).size).toBe(1);
        expect(new Set(selected).size).toBe(1);
        expect(selected[0]).toBe(deselected[0]);
    });

    test('clearing the board takes the embedded page with it, leaving no live frame behind', async ({ page }) => {
        await setupEditor(page);
        await pasteText(page, SHARE_URL);
        await expect.poll(() => page.evaluate(() => shell.board.shapes.shapes.length)).toBe(1);
        await expect(page.frameLocator('iframe[src*="notion.site"]').locator('div')).toBeVisible();

        const inhabitants = () => page.evaluate(() => ({
            frames: document.querySelectorAll('iframe').length,
            live: [...document.querySelectorAll('iframe')].filter(f => f.src && f.src !== 'about:blank').length,
            overlays: [...document.body.children].filter(e => e.tagName === 'DIV' && e.style.zIndex === '100').length
        }));

        expect(await inhabitants()).toEqual({ frames: 1, live: 1, overlays: 1 });

        await page.evaluate(() => shell.board.clear());

        await expect.poll(inhabitants).toEqual({ frames: 0, live: 0, overlays: 0 });
    });

    test('deleting the shape leaves no live frame behind either', async ({ page }) => {
        await setupEditor(page);
        await pasteText(page, SHARE_URL);
        await expect.poll(() => page.evaluate(() => shell.board.shapes.shapes.length)).toBe(1);
        await expect(page.frameLocator('iframe[src*="notion.site"]').locator('div')).toBeVisible();

        await page.evaluate(() => shell.board.removeShape(shell.board.shapes.shapes[0]));

        await expect.poll(() => page.evaluate(() => ({
            frames: document.querySelectorAll('iframe').length,
            overlays: [...document.body.children].filter(e => e.tagName === 'DIV' && e.style.zIndex === '100').length
        }))).toEqual({ frames: 0, overlays: 0 });
    });

    test('every published link form resolves to the embed URL, and nothing else does', async ({ page }) => {
        await setupEditor(page);

        const resolved = await page.evaluate(pageId => [
            `https://vdt.notion.site/Oscilosc-pios-medi-es-${pageId}?source=copy_link`,
            `https://vdt.notion.site/${pageId}`,
            'https://vdt.notion.site/917e3b02-e71a-4b10-a0ae-8bcf563a43e2',
            `https://vdt.notion.site/ebd/${pageId}`,
            `https://my-space.notion.site/Page-${pageId}#heading`,
            'https://modellus.notion.site/lunar-lander',
            'https://modellus.notion.site/lunar-lander?pvs=4',
            `https://www.notion.so/Oscilosc-pios-${pageId}`,
            'https://vdt.notion.site/',
            `https://evil.test/vdt.notion.site/${pageId}`
        ].map(url => shell.clipboardPasteController.getEmbedUrl(url)), PAGE_ID);

        expect(resolved).toEqual([
            EMBED_URL,
            EMBED_URL,
            EMBED_URL,
            EMBED_URL,
            `https://my-space.notion.site/ebd/${PAGE_ID}`,
            'https://modellus.notion.site/ebd/lunar-lander',
            'https://modellus.notion.site/ebd/lunar-lander',
            null,
            null,
            null
        ]);
    });

    test('a notion.site link still reaches the video and image rules it is not', async ({ page }) => {
        await setupEditor(page);

        const resolved = await page.evaluate(() => [
            shell.clipboardPasteController.getEmbedUrl('https://youtu.be/00BL4t4azJc'),
            shell.clipboardPasteController.getEmbedUrl('https://vimeo.com/824804225')
        ]);

        expect(resolved).toEqual([
            'https://www.youtube.com/embed/00BL4t4azJc',
            'https://player.vimeo.com/video/824804225'
        ]);
    });
});
