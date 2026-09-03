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

    test('a body told which way it faces turns to that direction instead of the way it travels', async ({ page }) => {
        await setupEditor(page);
        const result = await page.evaluate(() => {
            shell.commands.addShape('BodyShape', 'Body');
            const body = shell.board.shapes.getByName('Body');
            BodyShape.apiCharacterDefinitions.set('oriented-character', {
                id: 'oriented-character',
                name: 'Oriented character',
                centerPoint: { x: 0.5, y: 0.5 },
                shouldRotate: true,
                animations: []
            });
            body.setProperties({
                characterKey: 'oriented-character',
                xTerm: 'x',
                yTerm: 'y',
                orientationXTerm: 'vx',
                orientationYTerm: 'vy',
                orientationTermCase: 1
            });
            shell.calculator.isTerm = term => ['x', 'y', 'vx', 'vy'].includes(term);
            shell.calculator.getByName = term => term === 'vx' ? 0 : 5;
            shell.calculator.system.getByNameOnIteration = (iteration, term) => term === 'x' ? iteration : 0;
            shell.calculator.getIteration = () => 4;
            body.tick();
            const facingUp = body.getCharacterRotationAngle(body.getSelectedCharacter());
            shell.calculator.getByName = term => term === 'vx' ? 3 : 0;
            return {
                facingUp: facingUp,
                facingRight: body.getCharacterRotationAngle(body.getSelectedCharacter()),
                movementAngle: body.characterMovementAngle,
                flipped: body.flipImageHorizontally
            };
        });
        // The vertical component grows upwards, which is where the character is turned to face.
        expect(result.facingUp).toBeCloseTo(-90, 5);
        expect(result.facingRight).toBeCloseTo(0, 5);
        // Neither the direction it travels nor the automatic flip may turn it as well.
        expect(result.movementAngle).toBeNull();
        expect(result.flipped).toBe(false);
    });

    test('a body facing nowhere in particular keeps to the way it travels', async ({ page }) => {
        await setupEditor(page);
        const angle = await page.evaluate(() => {
            shell.commands.addShape('BodyShape', 'Body');
            const body = shell.board.shapes.getByName('Body');
            BodyShape.apiCharacterDefinitions.set('travelling-character', {
                id: 'travelling-character',
                name: 'Travelling character',
                centerPoint: { x: 0.5, y: 0.5 },
                shouldRotate: true,
                animations: []
            });
            body.setProperties({ characterKey: 'travelling-character', xTerm: 'x', yTerm: 'y' });
            shell.calculator.isTerm = term => term === 'x' || term === 'y';
            shell.calculator.getIteration = () => 4;
            shell.calculator.system.getByNameOnIteration = (iteration, term) => term === 'x' ? iteration : 3;
            body.tick();
            return body.getCharacterRotationAngle(body.getSelectedCharacter());
        });
        expect(angle).toBeCloseTo(0, 5);
    });

    test('each stroboscopy ghost faces the direction its own iteration names', async ({ page }) => {
        await setupEditor(page);
        const rotations = await page.evaluate(() => {
            shell.commands.addShape('BodyShape', 'Body');
            const body = shell.board.shapes.getByName('Body');
            BodyShape.apiCharacterDefinitions.set('oriented-stroboscopy-character', {
                id: 'oriented-stroboscopy-character',
                name: 'Oriented stroboscopy character',
                centerPoint: { x: 0.5, y: 0.5 },
                shouldRotate: true,
                animations: []
            });
            body.setProperties({
                characterKey: 'oriented-stroboscopy-character',
                xTerm: 'x',
                yTerm: 'y',
                orientationXTerm: 'vx',
                orientationYTerm: 'vy',
                stroboscopyInterval: 2,
                stroboscopyColor: '#ff0000'
            });
            shell.calculator.isTerm = term => ['x', 'y', 'vx', 'vy'].includes(term);
            shell.calculator.getLastIteration = () => 4;
            shell.calculator.system.getByNameOnIteration = (iteration, term) => {
                if (term === 'vx')
                    return 0;
                if (term === 'vy')
                    return iteration === 1 ? 1 : -1;
                return iteration;
            };
            body.trajectory.values = [
                { x: 10, y: 10 },
                { x: 20, y: 20 },
                { x: 30, y: 30 },
                { x: 40, y: 40 }
            ];
            body.tickStroboscopy();
            return body._stroboscopyPositions.map(position => position.rotation);
        });
        expect(rotations).toEqual([-90, 90]);
    });

    test('an image body is drawn turned to the direction the pair names', async ({ page }) => {
        await setupEditor(page);
        const transform = await page.evaluate(() => {
            modellus.shape.addReferential('Referential');
            modellus.shape.addBody('Body', 'Referential');
            const body = shell.board.shapes.getByName('Body');
            shell.calculator.isTerm = term => term === 'vx' || term === 'vy';
            shell.calculator.getByName = term => term === 'vx' ? -2 : 0;
            body.setProperties({
                imageUrl: 'https://example.com/arrow.png',
                orientationXTerm: 'vx',
                orientationYTerm: 'vy'
            });
            body.tick();
            body.draw();
            return body.image.getAttribute('transform');
        });
        expect(transform).toMatch(/^rotate\(180 /);
    });

    test('the terms menu edits the pair naming the orientation on one row', async ({ page }) => {
        await setupEditor(page);
        await page.evaluate(() => {
            modellus.shape.addReferential('Referential');
            modellus.shape.addBody('Body', 'Referential');
            shell.board.selection.select(shell.board.shapes.getByName('Body'));
        });
        await page.waitForTimeout(300);
        await page.locator('.shape-context-toolbar.visible .mdl-terms-selector').click();
        await page.waitForTimeout(400);
        // Every row is one chip, so the menu's rows are all the same width whatever they name.
        const controlWidths = await page.evaluate(() => Array.from(document.querySelectorAll('.mdl-shape-overlay-popup .mdl-dropdown-list-control')).map(control => Math.round(control.getBoundingClientRect().width)));
        expect(controlWidths.length).toBeGreaterThan(1);
        expect(new Set(controlWidths).size).toBe(1);
        // The pair is named inside the chip: a selector for each half of it, and no colour to choose.
        await page.evaluate(() => {
            const row = Array.from(document.querySelectorAll('.mdl-shape-overlay-popup .mdl-dropdown-list-item')).find(item => item.querySelector('.mdl-dropdown-list-label')?.textContent === 'Orientation');
            DevExpress.ui.dxDropDownBox.getInstance(row.querySelector('.shape-term-term')).open();
        });
        await page.waitForTimeout(500);
        const panel = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('.mdl-term-editor-rows')).find(element => element.offsetParent !== null);
            return {
                labels: Array.from(rows.querySelectorAll('.mdl-term-editor-row-label')).map(label => label.textContent),
                selectors: rows.querySelectorAll('.dx-dropdowneditor').length,
                colors: rows.querySelectorAll('.mdl-color-picker').length
            };
        });
        expect(panel.labels).toEqual(['Term', 'Paired term']);
        expect(panel.selectors).toBe(2);
        expect(panel.colors).toBe(0);
        await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('.mdl-term-editor-rows')).find(element => element.offsetParent !== null);
            DevExpress.ui.dxDropDownBox.getInstance(rows.querySelector('.shape-term-extra-term .dx-dropdowneditor')).open();
        });
        await page.waitForTimeout(400);
        await page.locator('.mdl-term-tree-popup .mdl-term-tree-custom-input input').fill('4');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(300);
        // The value typed into the second selector belongs to the second selector alone.
        const written = await page.evaluate(() => {
            const body = shell.board.shapes.getByName('Body');
            return { horizontal: body.properties.orientationXTerm, vertical: body.properties.orientationYTerm };
        });
        expect(written).toEqual({ horizontal: '', vertical: '4' });
    });
});
