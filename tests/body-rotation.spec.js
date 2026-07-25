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

test.describe('Body character rotation', () => {
    test('uses previous and current system term values instead of the last rendered position', async ({ page }) => {
        await setupEditor(page);
        const angle = await page.evaluate(() => {
            shell.commands.addShape('BodyShape', 'Body');
            const body = shell.board.shapes.getByName('Body');
            BodyShape.apiCharacterDefinitions.set('rotating-character', {
                id: 'rotating-character',
                name: 'Rotating character',
                centerPoint: { x: 0.5, y: 0.5 },
                shouldRotate: true,
                animations: []
            });
            body.setProperties({
                characterKey: 'rotating-character',
                xTerm: 'x',
                yTerm: 'y',
                xTermCase: 1,
                yTermCase: 1
            });
            shell.calculator.getIteration = () => 4;
            shell.calculator.isTerm = term => term === 'x' || term === 'y';
            shell.calculator.system.getByNameOnIteration = (iteration, term) => term === 'x' ? iteration : 3;
            body.lastBoardPosition = { x: 4, y: -20 };
            body.tick();
            return body.characterMovementAngle;
        });
        expect(angle).toBeCloseTo(0, 5);
    });
});
