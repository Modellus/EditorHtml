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

    test('uses system term values to rotate each stroboscopy image', async ({ page }) => {
        await setupEditor(page);
        const result = await page.evaluate(() => {
            shell.commands.addShape('BodyShape', 'Body');
            const body = shell.board.shapes.getByName('Body');
            BodyShape.apiCharacterDefinitions.set('stroboscopy-character', {
                id: 'stroboscopy-character',
                name: 'Stroboscopy character',
                centerPoint: { x: 0.5, y: 0.5 },
                shouldRotate: true,
                animations: []
            });
            body.setProperties({
                characterKey: 'stroboscopy-character',
                xTerm: 'x',
                yTerm: 'y',
                xTermCase: 1,
                yTermCase: 1,
                stroboscopyInterval: 2,
                stroboscopyColor: '#ff0000'
            });
            shell.calculator.isTerm = term => term === 'x' || term === 'y';
            shell.calculator.getLastIteration = () => 4;
            shell.calculator.system.getByNameOnIteration = (iteration, term) => {
                if (term === 'x')
                    return Math.min(iteration - 1, 1);
                return Math.max(iteration - 2, 0);
            };
            body.trajectory.values = [
                { x: 10, y: 10 },
                { x: 20, y: 20 },
                { x: 30, y: 30 },
                { x: 40, y: 40 }
            ];
            body.tickStroboscopy();
            body.drawStroboscopy();
            return {
                rotations: body._stroboscopyPositions.map(position => position.rotation),
                transforms: [...body.stroboscopy.children].map(image => image.getAttribute('transform'))
            };
        });
        // Ghosts are sampled on whole multiples of the interval: iterations 1 and 3.
        expect(result.rotations).toEqual([0, -90]);
        expect(result.transforms).toEqual(['rotate(0 10 10)', 'rotate(-90 30 30)']);
    });
});
