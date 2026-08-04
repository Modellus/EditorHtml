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

    test('pasting an image URL creates a media shape showing that image', async ({ page }) => {
        await setupEditor(page);
        await pasteText(page, 'http://localhost:8432/build/icon.png');

        const state = await page.evaluate(() => {
            const shape = shell.board.shapes.shapes.find(s => s.constructor.name === 'MediaShape');
            return { imageUrl: shape?.properties.imageUrl ?? null, videoUrl: shape?.properties.videoUrl ?? null };
        });

        expect(state.imageUrl).toBe('http://localhost:8432/build/icon.png');
        expect(state.videoUrl).toBe('');
    });

    test('pasting a video URL creates a media shape playing that video', async ({ page }) => {
        await setupEditor(page);
        await pasteText(page, 'https://videos.test/lesson.mp4?token=abc#t=10');

        const state = await page.evaluate(() => {
            const shape = shell.board.shapes.shapes.find(s => s.constructor.name === 'MediaShape');
            return { videoUrl: shape?.properties.videoUrl ?? null, imageUrl: shape?.properties.imageUrl ?? null };
        });

        expect(state.videoUrl).toBe('https://videos.test/lesson.mp4?token=abc#t=10');
        expect(state.imageUrl).toBe('');
    });

    test('pasting a YouTube share link creates a media shape embedding that video', async ({ page }) => {
        await setupEditor(page);
        await pasteText(page, 'https://youtu.be/00BL4t4azJc?si=N7ZzY2a0UBOFwcRC');
        await page.waitForTimeout(400);

        const state = await page.evaluate(() => {
            const shape = shell.board.shapes.shapes.find(s => s.constructor.name === 'MediaShape');
            const frame = shape?._overlayFrameElement;
            return {
                shapes: shell.board.shapes.shapes.map(s => s.constructor.name),
                embedUrl: shape?.properties.embedUrl ?? null,
                videoUrl: shape?.properties.videoUrl ?? null,
                frameSrc: frame?.getAttribute('src') ?? null,
                frameVisible: frame?.style.display ?? null,
                imageDisplay: shape?.image.getAttribute('display') ?? null
            };
        });

        expect(state.shapes).toEqual(['MediaShape']);
        expect(state.embedUrl).toBe('https://www.youtube.com/embed/00BL4t4azJc');
        expect(state.videoUrl).toBe('');
        expect(state.frameSrc).toBe('https://www.youtube.com/embed/00BL4t4azJc');
        expect(state.frameVisible).toBe('block');
        expect(state.imageDisplay).toBe('none');
    });

    test('every YouTube and Vimeo link form resolves to its embed player', async ({ page }) => {
        await setupEditor(page);

        const resolved = await page.evaluate(() => {
            const controller = shell.clipboardPasteController;
            return [
                'https://youtu.be/00BL4t4azJc?si=N7ZzY2a0UBOFwcRC',
                'https://www.youtube.com/watch?v=00BL4t4azJc',
                'https://www.youtube.com/watch?list=PL1&v=00BL4t4azJc&t=42',
                'https://www.youtube.com/shorts/00BL4t4azJc',
                'https://youtube.com/embed/00BL4t4azJc',
                'https://vimeo.com/824804225',
                'https://example.test/watch?v=00BL4t4azJc'
            ].map(url => controller.getEmbedUrl(url));
        });

        expect(resolved).toEqual([
            'https://www.youtube.com/embed/00BL4t4azJc',
            'https://www.youtube.com/embed/00BL4t4azJc',
            'https://www.youtube.com/embed/00BL4t4azJc',
            'https://www.youtube.com/embed/00BL4t4azJc',
            'https://www.youtube.com/embed/00BL4t4azJc',
            'https://player.vimeo.com/video/824804225',
            null
        ]);
    });

    test('deleting an embedded video stops its player instead of leaving it playing', async ({ page }) => {
        await setupEditor(page);
        await pasteText(page, 'https://youtu.be/00BL4t4azJc');
        await page.waitForTimeout(400);

        const state = await page.evaluate(() => {
            const shape = shell.board.shapes.shapes[0];
            shell.board.removeShape(shape);
            return {
                shapeCount: shell.board.shapes.shapes.length,
                frameSrc: shape._overlayFrameElement.getAttribute('src'),
                overlayDisplay: shape._mediaOverlayDiv.style.display
            };
        });

        expect(state.shapeCount).toBe(0);
        expect(state.frameSrc).toBe('');
        expect(state.overlayDisplay).toBe('none');
    });

    test('an embedded video restored by undo starts playing again', async ({ page }) => {
        await setupEditor(page);
        await pasteText(page, 'https://youtu.be/00BL4t4azJc');
        await page.waitForTimeout(400);
        await page.evaluate(() => shell.board.shapes.shapes[0].remove());
        await page.waitForTimeout(200);
        await page.evaluate(() => modellus.undo());
        await page.waitForTimeout(400);

        const state = await page.evaluate(() => {
            const shape = shell.board.shapes.shapes.find(s => s.constructor.name === 'MediaShape');
            return {
                embedUrl: shape?.properties.embedUrl ?? null,
                frameSrc: shape?._overlayFrameElement.getAttribute('src') ?? null
            };
        });

        expect(state.embedUrl).toBe('https://www.youtube.com/embed/00BL4t4azJc');
        expect(state.frameSrc).toBe('https://www.youtube.com/embed/00BL4t4azJc');
    });

    test('an embedded video survives a serialize and open roundtrip', async ({ page }) => {
        await setupEditor(page);
        await pasteText(page, 'https://youtu.be/00BL4t4azJc');
        await page.waitForTimeout(400);

        const state = await page.evaluate(() => {
            shell.openModel(JSON.stringify(shell.serialize()));
            const shape = shell.board.shapes.shapes.find(s => s.constructor.name === 'MediaShape');
            return {
                embedUrl: shape?.properties.embedUrl ?? null,
                frameSrc: shape?._overlayFrameElement?.getAttribute('src') ?? null
            };
        });

        expect(state.embedUrl).toBe('https://www.youtube.com/embed/00BL4t4azJc');
        expect(state.frameSrc).toBe('https://www.youtube.com/embed/00BL4t4azJc');
    });

    test('pasting an audio URL creates a media shape playing that audio', async ({ page }) => {
        await setupEditor(page);
        await pasteText(page, 'https://audio.test/tone.mp3');

        const audioUrl = await page.evaluate(() => {
            const shape = shell.board.shapes.shapes.find(s => s.constructor.name === 'MediaShape');
            return shape?.properties.audioUrl ?? null;
        });

        expect(audioUrl).toBe('https://audio.test/tone.mp3');
    });

    test('pasting a CSV URL fetches the dataset into a data table shape', async ({ page }) => {
        await setupEditor(page);
        await pasteText(page, 'http://localhost:8432/tests/fixtures/paste-sample.csv');
        await page.waitForTimeout(400);

        const state = await page.evaluate(() => {
            const shape = shell.board.shapes.shapes.find(s => s.constructor.name === 'DataTableShape');
            return {
                names: shape?.properties.externalData?.names ?? null,
                values: shape?.properties.externalData?.values ?? null
            };
        });

        expect(state.names).toEqual(['x', 'v']);
        expect(state.values).toEqual([[0.4, 0], [0.42, 0.04], [0.45, 0.1]]);
    });

    test('an extensionless URL is classified by the content type its server reports', async ({ page }) => {
        await setupEditor(page);
        await page.evaluate(() => {
            window.headRequests = [];
            const originalFetch = window.fetch;
            window.fetch = (url, options) => {
                if (String(url) !== 'https://cdn.test/assets/9f3a21')
                    return originalFetch(url, options);
                window.headRequests.push({ url, method: options?.method ?? 'GET' });
                return Promise.resolve(new Response(null, { status: 200, headers: { 'content-type': 'video/mp4; codecs=avc1' } }));
            };
        });
        await pasteText(page, 'https://cdn.test/assets/9f3a21');
        await page.waitForTimeout(400);

        const state = await page.evaluate(() => {
            const shape = shell.board.shapes.shapes.find(s => s.constructor.name === 'MediaShape');
            return { videoUrl: shape?.properties.videoUrl ?? null, requests: window.headRequests };
        });

        expect(state.requests[0]).toEqual({ url: 'https://cdn.test/assets/9f3a21', method: 'HEAD' });
        expect(state.videoUrl).toBe('https://cdn.test/assets/9f3a21');
    });

    test('a URL that is not media becomes a text shape holding a clickable link', async ({ page }) => {
        await setupEditor(page);
        await pasteText(page, 'http://localhost:8432/pages/board/index.html');
        await page.waitForTimeout(400);

        const state = await page.evaluate(() => {
            const shape = shell.board.shapes.shapes.find(s => s.constructor.name === 'TextShape');
            return {
                text: shape?.properties.text ?? null,
                anchorHref: shape?.container.querySelector('a')?.getAttribute('href') ?? null,
                mediaCount: shell.board.shapes.shapes.filter(s => s.constructor.name === 'MediaShape').length
            };
        });

        expect(state.text).toContain('http://localhost:8432/pages/board/index.html');
        expect(state.anchorHref).toBe('http://localhost:8432/pages/board/index.html');
        expect(state.mediaCount).toBe(0);
    });

    test('a link URL carrying markup characters is escaped, not injected', async ({ page }) => {
        await setupEditor(page);
        await page.evaluate(() => {
            const originalFetch = window.fetch;
            window.fetch = (url, options) => {
                if (!String(url).startsWith('https://cdn.test/'))
                    return originalFetch(url, options);
                return Promise.reject(new Error('blocked'));
            };
        });
        await pasteText(page, 'https://cdn.test/a"onmouseover="alert(1)');
        await page.waitForTimeout(400);

        const state = await page.evaluate(() => {
            const shape = shell.board.shapes.shapes.find(s => s.constructor.name === 'TextShape');
            const anchor = shape?.container.querySelector('a');
            return {
                href: anchor?.getAttribute('href') ?? null,
                onmouseover: anchor?.getAttribute('onmouseover') ?? null
            };
        });

        expect(state.href).toBe('https://cdn.test/a"onmouseover="alert(1)');
        expect(state.onmouseover).toBe(null);
    });

    test('a CSV URL that cannot be fetched falls back to a link text shape', async ({ page }) => {
        await setupEditor(page);
        await pasteText(page, 'https://unreachable.invalid/data/readings.csv');
        await page.waitForTimeout(600);

        const state = await page.evaluate(() => ({
            shapes: shell.board.shapes.shapes.map(s => s.constructor.name),
            anchorHref: shell.board.shapes.shapes[0]?.container.querySelector('a')?.getAttribute('href') ?? null
        }));

        expect(state.shapes).toEqual(['TextShape']);
        expect(state.anchorHref).toBe('https://unreachable.invalid/data/readings.csv');
    });

    test('a URL whose server cannot be reached still becomes a link text shape', async ({ page }) => {
        await setupEditor(page);
        await pasteText(page, 'https://unreachable.invalid/some/resource');
        await page.waitForTimeout(600);

        const state = await page.evaluate(() => ({
            shapes: shell.board.shapes.shapes.map(s => s.constructor.name),
            anchorHref: shell.board.shapes.shapes[0]?.container.querySelector('a')?.getAttribute('href') ?? null
        }));

        expect(state.shapes).toEqual(['TextShape']);
        expect(state.anchorHref).toBe('https://unreachable.invalid/some/resource');
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
