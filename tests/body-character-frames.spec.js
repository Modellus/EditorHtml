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

test.describe('Body character animation frames', () => {
    test('keeps the pivot steady while frames are still loading', async ({ page }) => {
        await setupEditor(page);
        const result = await page.evaluate(() => {
            shell.commands.addShape('BodyShape', 'Body');
            const body = shell.board.shapes.getByName('Body');
            BodyShape.apiCharacterDefinitions.set('walking-character', {
                id: 'walking-character',
                name: 'Walking character',
                thumbnail_url: 'thumbnail.png',
                centerPoint: { x: 0.5, y: 0.9 },
                shouldRotate: false,
                animations: [{ name: 'Walk', frames: 4, frameUrls: ['frame-0.png', 'frame-1.png', 'frame-2.png', 'frame-3.png'], startIndex: 0 }]
            });
            BodyShape.characterImageAspectCache.clear();
            // Only the first frame has been measured; the others are still loading.
            BodyShape.characterImageAspectCache.set('frame-0.png', 1.5);
            let iteration = 0;
            shell.calculator.getIteration = () => iteration;
            shell.calculator.isTerm = () => false;
            body.setProperties({ characterKey: 'walking-character', xTerm: '0', yTerm: '0' });
            const frames = [];
            for (iteration = 0; iteration < 4; iteration++) {
                body.draw();
                frames.push({
                    href: body.image.getAttribute('href'),
                    x: Number(body.image.getAttribute('x')),
                    y: Number(body.image.getAttribute('y'))
                });
            }
            return frames;
        });
        console.log(JSON.stringify(result));
        expect(result.map(frame => frame.href)).toEqual(['frame-0.png', 'frame-1.png', 'frame-2.png', 'frame-3.png']);
        for (const frame of result) {
            expect(frame.x).toBeCloseTo(result[0].x, 5);
            expect(frame.y).toBeCloseTo(result[0].y, 5);
        }
    });
});
