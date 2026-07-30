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

test.describe('Stroboscopy', () => {
    test('samples ghosts on whole multiples of the interval', async ({ page }) => {
        await setupEditor(page);
        const result = await page.evaluate(() => {
            shell.commands.addShape('PointShape', 'Point');
            const point = shell.board.shapes.getByName('Point');
            let iteration = 1;
            shell.calculator.isTerm = term => term === 'x' || term === 'y';
            shell.calculator.getIteration = () => iteration;
            shell.calculator.getLastIteration = () => iteration;
            shell.calculator.getByName = () => 0;
            shell.calculator.system.getByNameOnIteration = () => 0;
            point.setProperties({ xTerm: 'x', yTerm: 'y', stroboscopyInterval: 10, stroboscopyColor: '#ff0000' });
            for (let i = 1; i <= 41; i++) {
                iteration = i;
                point.tick();
            }
            return point._stroboscopyPositions.map(position => position.iteration);
        });
        // An independent variable starting at 0 with a step of 0.1 is at 0, 1, 2, 3, 4
        // on these iterations - the ghosts must land on those whole values.
        expect(result).toEqual([1, 11, 21, 31, 41]);
    });

    test('labels each ghost with name = value where the live term label sits', async ({ page }) => {
        await setupEditor(page);
        const result = await page.evaluate(() => {
            shell.commands.addShape('ReferentialShape', 'Referential');
            shell.commands.addShape('PointShape', 'Point');
            const point = shell.board.shapes.getByName('Point');
            const referential = shell.board.shapes.shapes.find(shape => shape.isReferential);
            if (point.getReferentialParent() !== referential) {
                point.parent?.children.splice(point.parent.children.indexOf(point), 1);
                point.parent = referential;
                referential.children.push(point);
                point.properties.parentId = referential.id;
            }
            let iteration = 5;
            shell.calculator.isTerm = term => term === 'x' || term === 'y';
            shell.calculator.getIteration = () => iteration;
            shell.calculator.getLastIteration = () => iteration;
            shell.calculator.getByName = term => term === 'x' ? 40 + iteration * 10 : 20 + iteration * 5;
            shell.calculator.system.getByNameOnIteration = (it, term) => term === 'x' ? 40 + it * 10 : 20 + it * 5;
            point.setProperties({
                xTerm: 'x',
                yTerm: 'y',
                xTermDisplayMode: 'value',
                yTermDisplayMode: 'value',
                stroboscopyInterval: 2,
                stroboscopyColor: '#ff0000',
                stroboscopyOpacity: 0.5
            });
            for (let i = 1; i <= 5; i++) {
                iteration = i;
                point.tick();
            }
            iteration = 5;
            point.draw();
            const readLabel = group => {
                const text = group.lastChild;
                return {
                    x: Number(text.getAttribute('x')),
                    y: Number(text.getAttribute('y')),
                    text: text.textContent,
                    fill: text.getAttribute('fill'),
                    backgroundFill: group.firstChild.getAttribute('fill'),
                    opacity: group.getAttribute('opacity')
                };
            };
            return {
                liveLabels: [...point.termDisplay.labelsLayer.children].map(readLabel),
                ghostLabels: [...point.stroboscopyLabels.children].map(readLabel)
            };
        });
        expect(result.liveLabels.length).toBe(2);
        expect(result.ghostLabels.length).toBe(6);
        for (const ghostLabel of result.ghostLabels) {
            expect(ghostLabel.text).toContain('=');
            expect(ghostLabel.backgroundFill).toBe('#ff0000');
            expect(ghostLabel.fill).toBe('#ffffff');
            expect(ghostLabel.opacity).toBe('0.5');
        }
        // The ghost of the current iteration shares the live label placement.
        for (const liveLabel of result.liveLabels) {
            const match = result.ghostLabels.find(ghost => ghost.text === liveLabel.text && Math.abs(ghost.x - liveLabel.x) < 0.5 && Math.abs(ghost.y - liveLabel.y) < 0.5);
            expect(match, `no ghost label at the live label position of ${liveLabel.text}`).toBeTruthy();
        }
    });
});
