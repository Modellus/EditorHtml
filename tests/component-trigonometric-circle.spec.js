const { test, expect } = require('@playwright/test');

const BOARD_URL = '/pages/board/index.html';

async function setupBoard(page) {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto(BOARD_URL);
    await page.waitForFunction(() => typeof shell !== 'undefined' && shell !== null && shell.board !== null, null, { timeout: 15000 });
}

// Six rows the model leaves free and three it works out for itself, so the same board can ask what a
// circle does with each kind: a term with a definition behind it moves the point, and a term the
// model only holds is the drag's to write.
async function addCircleModel(page) {
    await page.evaluate(() => modellus.shape.addExpression('Circle equations'));
    await page.evaluate(() => {
        shell.board.shapes.getByName('Circle equations').properties.expression = [
            '\\frac{dtheta}{dt}=0',
            '\\frac{dradius}{dt}=0',
            '\\frac{dacross}{dt}=0',
            '\\frac{dup}{dt}=0',
            '\\frac{dtangent}{dt}=0',
            '\\frac{darc}{dt}=0',
            'turned=0.5',
            'computedAcross=-0.6',
            'computedUp=0.8'
        ].join('\\\\');
        shell.reset();
    });
    await page.waitForFunction(() => shell.board.calculator.isTerm('turned') && shell.board.calculator.isTerm('theta'));
}

async function addCircle(page, overrides = {}) {
    await page.evaluate(overrides => {
        const shape = shell.commands.addComponent('trigonometric-circle', 'Circle');
        shape.setProperties(Object.assign({ x: 200, y: 140, width: 280, height: 280 }, overrides));
        shape.draw();
    }, overrides);
    await expect(page.locator('[data-source-id="point"]')).toHaveCount(1);
}

function readNode(page, sourceId) {
    return page.evaluate(sourceId => {
        const node = shell.board.shapes.getByName('Circle').element.querySelector(`[data-source-id="${sourceId}"]`);
        if (!node)
            return null;
        return Object.fromEntries(Array.from(node.attributes).map(attribute => [attribute.name, attribute.value]));
    }, sourceId);
}

function readProperties(page, names) {
    return page.evaluate(names => {
        const shape = shell.board.shapes.getByName('Circle');
        return Object.fromEntries(names.map(name => [name, Number(shape.properties[name])]));
    }, names);
}

function readTerms(page, names) {
    return page.evaluate(names => Object.fromEntries(names.map(name => [name, Number(shell.board.calculator.getByName(name, 1))])), names);
}

// Where the circle stands on the screen, so a drag can be aimed at an angle rather than at a pixel.
async function readCentre(page) {
    return page.evaluate(() => {
        const box = shell.board.shapes.getByName('Circle').element.querySelector('[data-source-id="circle"]').getBoundingClientRect();
        return { x: box.x + box.width / 2, y: box.y + box.height / 2, reach: box.width / 2 };
    });
}

// The point is the only thing on the circle that can be taken hold of, so a drag always starts on it
// and goes wherever it is being taken.
async function dragTo(page, centre, radians, reachFactor = 1) {
    const reach = centre.reach * reachFactor;
    const start = await page.evaluate(() => {
        const box = shell.board.shapes.getByName('Circle').element.querySelector('[data-source-id="point"]').getBoundingClientRect();
        return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    });
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(centre.x + Math.cos(radians) * reach, centre.y - Math.sin(radians) * reach, { steps: 6 });
    await page.mouse.up();
}

async function showReadings(page, rows) {
    await page.evaluate(rows => {
        const shape = shell.board.shapes.getByName('Circle');
        shape.setProperties(Object.fromEntries(rows.map(row => [`${row}DisplayMode`, 'nameValue'])));
        shape.draw();
    }, rows);
    await expect(page.locator('.shape-term-label').first()).toBeVisible();
}

// Each reading the eye has turned on: what it says, the mark standing in front of it, and where it
// stands in the object's own coordinates.
function readReadings(page) {
    return page.evaluate(() => {
        const shape = shell.board.shapes.getByName('Circle');
        const box = shape.element.getBoundingClientRect();
        return Array.from(shape.element.querySelectorAll('.shape-term-label')).map(label => {
            const group = label.parentNode;
            const mark = group.querySelector('.shape-term-label-icon');
            // A value that is mathematics is typeset in a box beside the text, so what the reading says
            // is the text and the mathematics together.
            const maths = group.querySelector('.shape-term-label-math > div');
            const bounds = label.getBoundingClientRect();
            return {
                text: label.textContent,
                maths: maths?.dataset?.latex ?? '',
                mark: mark ? mark.textContent : '',
                mirrored: mark?.getAttribute('transform') ? 'mirrored' : '',
                markColor: mark?.getAttribute('fill') ?? '',
                textColor: label.getAttribute('fill') ?? '',
                x: Math.round(bounds.x + bounds.width / 2 - box.x),
                y: Math.round(bounds.y + bounds.height / 2 - box.y)
            };
        });
    });
}

// What the first reading says, text and typeset mathematics together.
async function readAngleReading(page) {
    const readings = await readReadings(page);
    return `${readings[0]?.text ?? ''}${readings[0]?.maths ?? ''}`;
}

// The unit is chosen the way the toolbar chooses it, so what the choice carries with it is carried.
async function chooseAngleUnit(page, unit) {
    await page.evaluate(unit => {
        const shape = shell.board.shapes.getByName('Circle');
        shape.setComponentChoice(shape.getComponentParameter('angleUnit'), unit);
        shape.draw();
    }, unit);
    await expect.poll(() => page.evaluate(() => shell.board.shapes.getByName('Circle').properties.angleUnit)).toBe(unit);
}

// The board's own angle unit, which is what every angle on it — a term of the model's, or a number an
// object holds in its place — is counted in.
async function setModelAngleUnit(page, unit) {
    await page.evaluate(unit => {
        shell.setProperty('angleUnit', unit);
        shell.board.forceRefresh();
    }, unit);
    await expect.poll(() => page.evaluate(() => shell.properties.angleUnit)).toBe(unit);
}

function readPointCentre(page) {
    return nodeCentre(page, 'point');
}

// What the angle row shows at rest: the value as the row spells it, and the mark of the unit after it.
async function readAngleChip(page) {
    await page.evaluate(() => shell.board.selection.select(shell.board.shapes.getByName('Circle')));
    await page.locator('.shape-context-toolbar.visible .mdl-component-model-item').click();
    const row = page.locator('.mdl-shape-overlay-popup').last().locator('.mdl-dropdown-list-item').first();
    await expect(row).toBeVisible();
    // A portion of π stands on the row as typeset mathematics, so what it says is read off the field
    // rather than off the characters; a number of degrees is a number, and is read as text.
    const chip = await row.evaluate(element => ({
        value: element.querySelector('.mdl-term-editor-value')?.textContent
            ?? element.querySelector('.mdl-term-editor-value-field')?.getValue?.() ?? '',
        suffix: element.querySelector('.mdl-term-editor-value-suffix')?.textContent ?? ''
    }));
    await page.keyboard.press('Escape');
    return chip;
}

function nodeCentre(page, sourceId) {
    return page.evaluate(sourceId => {
        const shape = shell.board.shapes.getByName('Circle');
        const box = shape.element.getBoundingClientRect();
        const bounds = shape.element.querySelector(`[data-source-id="${sourceId}"]`).getBoundingClientRect();
        return { x: Math.round(bounds.x + bounds.width / 2 - box.x), y: Math.round(bounds.y + bounds.height / 2 - box.y) };
    }, sourceId);
}

async function buildDrawing(page, overrides, size = 280) {
    return page.evaluate(({ overrides, size }) => {
        const compiler = new BlockCompiler(BlockRegistry, new BlockBindings(shell.board.calculator));
        const definition = BlockObjects.createComponentInstance('trigonometric-circle');
        const parameters = Object.assign(BlockObjects.getInstancePropertyDefaults('trigonometric-circle'), overrides);
        const context = { width: size, height: size, parameters: parameters, tokens: new BlockTokens('standard') };
        const compilation = compiler.compile(definition, context);
        const validation = new BlockValidator(BlockRegistry, compiler).validate(definition, context);
        return {
            markup: BlockRenderer.toMarkup(compilation.nodes),
            nodes: Object.fromEntries(BlockRenderer.flatten(compilation.nodes).map(node => [node.sourceId, { text: node.text, attributes: node.attributes }])),
            frame: Object.fromEntries(['angleWrapped', 'radius', 'pointValueX', 'pointValueY', 'tangentValue', 'arcValue']
                .map(name => [name, compilation.componentFrame[name]])),
            diagnostics: compilation.diagnostics.map(diagnostic => diagnostic.code),
            errors: validation.errors.map(error => error.code),
            warnings: validation.warnings.map(warning => warning.code)
        };
    }, { overrides, size });
}

test.describe('trigonometric circle component', () => {
    test('compiles clean and draws every part the reader has switched on', async ({ page }) => {
        await setupBoard(page);
        const drawing = await buildDrawing(page, { showTangent: true, showArc: true });
        expect(drawing.diagnostics).toEqual([]);
        expect(drawing.errors).toEqual([]);
        expect(drawing.warnings).toEqual([]);
        for (const id of ['circle', 'point', 'radius-line', 'sine-segment', 'cosine-segment', 'tangent-area', 'arc', 'angle-wedge', 'point-grab'])
            expect(Object.keys(drawing.nodes), id).toContain(id);
        // The point is the one thing on the drawing that can be taken hold of, and it is the one thing
        // wearing a mark: the ends of the projections are where their lines already end.
        for (const id of ['circle-grab', 'radius-grab', 'origin', 'sine-point', 'cosine-point', 'tangent-point'])
            expect(Object.keys(drawing.nodes), id).not.toContain(id);
        // The cartesian parts are the board's own, not lines this object drew for itself.
        for (const id of ['grid', 'axis-across', 'axis-up'])
            expect(drawing.markup, id).toContain(`data-source-component-id="${id}"`);
    });

    // A part switched off goes from the drawing altogether rather than being drawn in nothing.
    test('a part switched off takes its drawing with it', async ({ page }) => {
        await setupBoard(page);
        const drawing = await buildDrawing(page, { showSine: false, showCosine: false, showArc: false, showTangent: false });
        for (const id of ['sine-segment', 'cosine-segment', 'arc', 'tangent-area', 'tangent-hypotenuse'])
            expect(Object.keys(drawing.nodes), id).not.toContain(id);
        // The points the readings stand at are the object's whatever it is drawing, so a row whose
        // part is switched off still has somewhere to put its value.
        for (const id of ['sine-anchor', 'cosine-anchor', 'tangent-anchor', 'arc-anchor'])
            expect(Object.keys(drawing.nodes), id).toContain(id);
    });

    // The point is the object's handle before it is the end of the radius, so it is still there to
    // take hold of when the radius has been given no colour.
    test('the point keeps a colour of its own when the radius has none', async ({ page }) => {
        await setupBoard(page);
        const drawing = await buildDrawing(page, { radiusColor: 'none' });
        expect(drawing.nodes.point.attributes.fill).toBe(drawing.nodes.circle.attributes.stroke);
    });

    // The tangent touches the circle where the point stands and stands square to the radius there,
    // running down to the horizontal axis. The triangle it closes is drawn the way a chart draws one:
    // shaded, the two legs dashed, and the tangent itself solid across them as the hypotenuse.
    test('the tangent stands square to the radius, and its triangle falls outside the circle', async ({ page }) => {
        await setupBoard(page);
        const drawing = await buildDrawing(page, { angleVariable: '0.9', showTangent: true });
        const centre = Number(drawing.nodes.circle.attributes.cx);
        const radius = Number(drawing.nodes.circle.attributes.r);
        const pointX = centre + radius * Math.cos(0.9);
        const pointY = centre - radius * Math.sin(0.9);
        // The tangent runs to either side of the point, square to the radius, and the whole of it is
        // the hypotenuse the triangle hangs off.
        const hypotenuse = drawing.nodes['tangent-hypotenuse'].attributes;
        const alongRadius = (pointX - centre) * (Number(hypotenuse.x2) - Number(hypotenuse.x1))
            + (pointY - centre) * (Number(hypotenuse.y2) - Number(hypotenuse.y1));
        expect(alongRadius).toBeCloseTo(0, 6);
        expect((Number(hypotenuse.x1) + Number(hypotenuse.x2)) / 2).toBeCloseTo(pointX, 6);
        expect((Number(hypotenuse.y1) + Number(hypotenuse.y2)) / 2).toBeCloseTo(pointY, 6);
        expect(drawing.nodes['tangent-area'].attributes.opacity).toBe(0.25);
        expect(drawing.nodes['tangent-base'].attributes['stroke-dasharray']).toBe('4 3');
        expect(drawing.nodes['tangent-rise'].attributes['stroke-dasharray']).toBe('4 3');
        expect(drawing.nodes['tangent-hypotenuse'].attributes['stroke-dasharray']).toBe(undefined);
        // The two legs meet at a right angle, one across and one up, and they close on the ends of the
        // hypotenuse rather than on the point.
        const base = drawing.nodes['tangent-base'].attributes;
        const rise = drawing.nodes['tangent-rise'].attributes;
        expect(Number(base.y1)).toBeCloseTo(Number(base.y2), 6);
        expect(Number(rise.x1)).toBeCloseTo(Number(rise.x2), 6);
        expect(Number(base.x1)).toBeCloseTo(Number(hypotenuse.x1), 6);
        expect(Number(rise.x2)).toBeCloseTo(Number(hypotenuse.x2), 6);
        expect(Number(base.x2)).toBeCloseTo(Number(rise.x1), 6);
        // The right angle is put on the side away from the centre, so the triangle stands outside the
        // circle rather than lying across it.
        const corner = Math.hypot(Number(base.x2) - centre, Number(base.y2) - centre);
        expect(corner).toBeGreaterThan(radius);
        const inside = Math.hypot(Number(hypotenuse.x1) - centre, Number(rise.y2) - centre);
        expect(inside).toBeLessThan(radius);
        expect(drawing.nodes['tangent-area'].attributes.d)
            .toBe(`M ${base.x1} ${base.y1} L ${base.x2} ${base.y2} L ${rise.x2} ${rise.y2} Z`);
    });

    test('the point stands where the angle and the radius put it', async ({ page }) => {
        await setupBoard(page);
        const drawing = await buildDrawing(page, { angleVariable: '0.9', radiusVariable: '1' });
        const centre = Number(drawing.nodes.circle.attributes.cx);
        const radius = Number(drawing.nodes.circle.attributes.r);
        expect(Number(drawing.nodes.point.attributes.cx)).toBeCloseTo(centre + radius * Math.cos(0.9), 6);
        expect(Number(drawing.nodes.point.attributes.cy)).toBeCloseTo(centre - radius * Math.sin(0.9), 6);
        expect(drawing.frame.pointValueY).toBeCloseTo(Math.sin(0.9), 6);
        expect(drawing.frame.pointValueX).toBeCloseTo(Math.cos(0.9), 6);
    });

    // An angle belongs to the model, and the model says what its angles are counted in: the same
    // quarter turn is 1.57 on a board working in radians and 90 on one working in degrees. The mark
    // the object wears says only how that angle is written, so it is read the same way under either.
    test('the angle row is read in the unit the model keeps its angles in', async ({ page }) => {
        await setupBoard(page);
        const inRadians = await buildDrawing(page, { angleUnit: 'degrees', angleVariable: '1.5707963268' });
        await setModelAngleUnit(page, 'degrees');
        const inDegrees = await buildDrawing(page, { angleUnit: 'radians', angleVariable: '90' });
        const centre = Number(inRadians.nodes.circle.attributes.cx);
        const radius = Number(inRadians.nodes.circle.attributes.r);
        expect(Number(inRadians.nodes.point.attributes.cy)).toBeCloseTo(centre - radius, 4);
        expect(Number(inDegrees.nodes.point.attributes.cy)).toBeCloseTo(centre - radius, 4);
    });

    // The arc is a length whatever the angle is counted in, so it is the radius times the angle in
    // radians on a board working in degrees just as much as on one working in radians.
    test('the arc is the radius times the angle in radians, whichever unit the angle is read in', async ({ page }) => {
        await setupBoard(page);
        await setModelAngleUnit(page, 'degrees');
        const drawing = await buildDrawing(page, { angleVariable: '90', radiusVariable: '2', arcColor: '#f08c02' });
        expect(drawing.frame.angleWrapped).toBeCloseTo(Math.PI / 2, 6);
        expect(drawing.frame.arcValue).toBeCloseTo(Math.PI, 6);
    });

    // A quarter turn stands the point where the tangent line is never met. Neither the segment nor
    // the reading is drawn there, and a tangent too long for the view is left out rather than cut
    // off at the edge of the box.
    test('the tangent is left undrawn where it never reaches the axis', async ({ page }) => {
        await setupBoard(page);
        const met = await buildDrawing(page, { angleVariable: '0.9', showTangent: true });
        const quarterTurn = await buildDrawing(page, { angleVariable: '1.5707963268', showTangent: true });
        const nearlyThere = await buildDrawing(page, { angleVariable: '1.5', showTangent: true });
        expect(Object.keys(met.nodes)).toContain('tangent-area');
        for (const id of ['tangent-area', 'tangent-hypotenuse', 'tangent-reading'])
            expect(Object.keys(quarterTurn.nodes), id).not.toContain(id);
        // A tangent reaching past the view is drawn and cut off at the edge of the box, the way a
        // chart cuts a curve, and its reading is held inside the box rather than following it out.
        expect(Object.keys(nearlyThere.nodes)).toContain('tangent-area');
        const anchor = nearlyThere.nodes['tangent-anchor'].attributes;
        expect(Number(anchor.x)).toBeLessThan(272);
        expect(Number(anchor.x)).toBeGreaterThan(8);
    });

    test('a term the model works out for itself turns the point', async ({ page }) => {
        await setupBoard(page);
        await addCircleModel(page);
        const drawing = await buildDrawing(page, { angleVariable: 'turned' });
        const centre = Number(drawing.nodes.circle.attributes.cx);
        const radius = Number(drawing.nodes.circle.attributes.r);
        expect(Number(drawing.nodes.point.attributes.cx)).toBeCloseTo(centre + radius * Math.cos(0.5), 6);
        expect(drawing.frame.angleWrapped).toBeCloseTo(0.5, 6);
    });

    // A pair the model works out for itself places the point directly, and then the angle and the
    // radius are read off the pair rather than the pair off them — which is what lets a model that
    // computes coordinates drive the circle without ever naming an angle.
    test('a pair the model works out places the point, and the angle is read off it', async ({ page }) => {
        await setupBoard(page);
        await addCircleModel(page);
        const drawing = await buildDrawing(page, { pointXVariable: 'computedAcross', pointYVariable: 'computedUp', angleVariable: '0', showArc: true });
        const centre = Number(drawing.nodes.circle.attributes.cx);
        const unit = Number(drawing.nodes.circle.attributes.r);
        expect(Number(drawing.nodes.point.attributes.cx)).toBeCloseTo(centre - 0.6 * unit, 4);
        expect(Number(drawing.nodes.point.attributes.cy)).toBeCloseTo(centre - 0.8 * unit, 4);
        // atan2(0.8, -0.6) is 2.2143 radians, and the arc it has swept is that times a radius of one.
        expect(drawing.frame.angleWrapped).toBeCloseTo(Math.atan2(0.8, -0.6), 6);
        expect(drawing.frame.radius).toBeCloseTo(1, 6);
        expect(drawing.frame.arcValue).toBeCloseTo(Math.atan2(0.8, -0.6), 6);
    });

    // The half turn is where an angle read from a pair would otherwise fall over, since the way the
    // angle is worked out has nothing to divide by there.
    test('a pair lying along the negative axis reads as a half turn rather than as nothing', async ({ page }) => {
        await setupBoard(page);
        await addCircleModel(page);
        await page.evaluate(() => {
            shell.board.shapes.getByName('Circle equations').properties.expression = 'computedAcross=-1\\\\computedUp=0';
            shell.reset();
        });
        await page.waitForFunction(() => Number(shell.board.calculator.getByName('computedAcross', 1)) === -1);
        const drawing = await buildDrawing(page, { pointXVariable: 'computedAcross', pointYVariable: 'computedUp' });
        expect(drawing.frame.angleWrapped).toBeCloseTo(Math.PI, 6);
    });

    // Neither the pair nor the angle being the model's own, a tangent it works out is what is left to
    // place the point by.
    test('a tangent the model works out places the point when nothing else does', async ({ page }) => {
        await setupBoard(page);
        await addCircleModel(page);
        await page.evaluate(() => {
            shell.board.shapes.getByName('Circle equations').properties.expression = 'slope=1';
            shell.reset();
        });
        await page.waitForFunction(() => Number(shell.board.calculator.getByName('slope', 1)) === 1);
        const drawing = await buildDrawing(page, { tangentVariable: 'slope', showTangent: true });
        expect(drawing.frame.angleWrapped).toBeCloseTo(Math.PI / 4, 6);
    });

    // The last of the four ways the point can be placed: an arc the model works out is divided by the
    // radius to say how far round the point has gone.
    test('an arc the model works out places the point when nothing before it does', async ({ page }) => {
        await setupBoard(page);
        await addCircleModel(page);
        await page.evaluate(() => {
            shell.board.shapes.getByName('Circle equations').properties.expression = 'travelled=3';
            shell.reset();
        });
        await page.waitForFunction(() => Number(shell.board.calculator.getByName('travelled', 1)) === 3);
        const drawing = await buildDrawing(page, { arcVariable: 'travelled', radiusVariable: '2', showArc: true });
        // Three along a circle of radius two is 1.5 radians round, and the arc reads back as it was given.
        expect(drawing.frame.angleWrapped).toBeCloseTo(1.5, 6);
        expect(drawing.frame.arcValue).toBeCloseTo(3, 6);
    });

    // The eye on a row is what shows its value, the way it is on every other shape, and the pill
    // stands beside the part the row belongs to rather than in a list of its own.
    test('the eye on a row draws its value beside the part it belongs to', async ({ page }) => {
        await setupBoard(page);
        await addCircle(page, { angleVariable: '0.9', showTangent: true, showArc: true });
        expect(await readReadings(page)).toEqual([]);
        await showReadings(page, ['angleVariable', 'pointXVariable', 'pointYVariable', 'tangentVariable']);
        const readings = await readReadings(page);
        expect(readings.map(reading => `${reading.text}${reading.maths}`)).toEqual([' = 0.286\\pi', ' = 0.62', ' = 0.78', ' = 1.26']);
        // Each stands within a couple of characters of the part it reads: the cosine on the
        // horizontal projection, the sine on the vertical one, the tangent on its triangle.
        const cosine = await nodeCentre(page, 'cosine-segment');
        const sine = await nodeCentre(page, 'sine-segment');
        expect(Math.abs(readings[1].x - cosine.x)).toBeLessThan(30);
        expect(Math.abs(readings[2].y - sine.y)).toBeLessThan(30);
        // The tangent's stands beyond the right angle of its triangle, further from the centre than
        // the circle is, so it is beside the tangent and never over the circle or the axes.
        const circle = await page.evaluate(() => {
            const node = shell.board.shapes.getByName('Circle').element.querySelector('[data-source-id="circle"]');
            const box = shell.board.shapes.getByName('Circle').element.getBoundingClientRect();
            const bounds = node.getBoundingClientRect();
            return { x: Math.round(bounds.x + bounds.width / 2 - box.x), y: Math.round(bounds.y + bounds.height / 2 - box.y), radius: bounds.width / 2 };
        });
        const corner = await nodeCentre(page, 'tangent-base');
        expect(Math.hypot(readings[3].x - circle.x, readings[3].y - circle.y)).toBeGreaterThan(circle.radius);
        expect(Math.hypot(readings[3].x - corner.x, readings[3].y - corner.y)).toBeLessThan(circle.radius);
    });

    // A row holding a plain number has no name to write, so the mark of what it measures stands where
    // the name would: an angle, an arrow out from the centre, a wave for the sine and the same wave
    // upside down for the cosine, the chart's ruler for the tangent and a turning arrow for the arc.
    test('a row with no name of its own is marked with what it measures', async ({ page }) => {
        await setupBoard(page);
        await addCircle(page, { angleVariable: '0.9', showTangent: true, showArc: true });
        await showReadings(page, ['angleVariable', 'radiusVariable', 'pointXVariable', 'pointYVariable', 'tangentVariable', 'arcVariable']);
        const readings = await readReadings(page);
        expect(readings.map(reading => `${reading.mark}${reading.mirrored}`)).toEqual([
            '\ue08c', '\ue09f', '\uf899mirrored', '\uf899', '\uf61c', '\uf3f4'
        ]);
        expect(readings.map(reading => `${reading.text}${reading.maths}`)).toEqual([' = 0.286\\pi', ' = 1.00', ' = 0.62', ' = 0.78', ' = 1.26', ' = 0.90']);
    });

    // Named, the row is called what the reader called it and the mark gives way to the name.
    test('a row that names a term is written with the name, not the mark', async ({ page }) => {
        await setupBoard(page);
        await addCircleModel(page);
        await addCircle(page, { angleVariable: 'theta', pointYVariable: 'up' });
        await page.evaluate(() => {
            shell.board.calculator.setTermValue('theta', 0.9, 1, 1);
            shell.board.calculator.calculate();
            shell.board.forceRefresh();
        });
        await showReadings(page, ['angleVariable', 'pointXVariable', 'pointYVariable']);
        await expect.poll(() => readReadings(page).then(readings => readings.map(reading => `${reading.mark}${reading.text}${reading.maths}`)))
            .toEqual(['theta = 0.286\\pi', '\uf899 = 0.62', 'up = 0.78']);
    });

    // A row read off the drawing rather than written into it holds whatever it was last given, and
    // that is not the drawing until something writes it. The reading says what the drawing shows,
    // so the number beside a projection can never disagree with the projection.
    test('a reading says what the drawing shows rather than what its row happens to hold', async ({ page }) => {
        await setupBoard(page);
        await addCircle(page, { angleVariable: '0.9', pointXVariable: '0', pointYVariable: '0' });
        await showReadings(page, ['pointXVariable', 'pointYVariable']);
        expect((await readReadings(page)).map(reading => reading.text)).toEqual([' = 0.62', ' = 0.78']);
        expect(await readProperties(page, ['pointXVariable', 'pointYVariable'])).toEqual({ pointXVariable: 0, pointYVariable: 0 });
    });

    test('dragging the point writes the angle and everything read from it into the terms that name them', async ({ page }) => {
        await setupBoard(page);
        await addCircleModel(page);
        await addCircle(page, {
            angleVariable: 'theta',
            radiusVariable: '1',
            pointXVariable: 'across',
            pointYVariable: 'up',
            tangentVariable: 'tangent',
            arcVariable: 'arc'
        });
        const centre = await readCentre(page);
        await dragTo(page, centre, Math.PI / 4);
        // The angle is rounded in the portion of π it is read as, so an eighth of a turn is that
        // eighth; everything read off it is rounded the way every other dragged value is.
        await expect.poll(() => readTerms(page, ['theta', 'across', 'up', 'tangent', 'arc'])).toEqual({
            theta: 0.785398163397,
            across: 0.71,
            up: 0.71,
            tangent: 1,
            arc: 0.79
        });
    });

    // A row holding a plain number names no term, so the gesture writes the object's own parameter
    // and the circle keeps the reading it was dragged to the way a dial bound to nothing does.
    test('a row holding a plain number is written on the object itself', async ({ page }) => {
        await setupBoard(page);
        await addCircle(page);
        const centre = await readCentre(page);
        await dragTo(page, centre, Math.PI);
        await expect.poll(() => readProperties(page, ['angleVariable', 'pointXVariable', 'pointYVariable', 'arcVariable'])).toEqual({
            angleVariable: 3.14159265359,
            pointXVariable: -1,
            pointYVariable: 0,
            arcVariable: 3.14
        });
    });

    // Asked for a number of parts, a dragged angle lands on one of them rather than wherever the
    // pointer left it: twelve parts is one every thirty degrees.
    test('a dragged angle lands on a part of the circle when the object asks for parts', async ({ page }) => {
        await setupBoard(page);
        await setModelAngleUnit(page, 'degrees');
        await addCircle(page, { angleVariable: '0', snapDivisions: 12 });
        const centre = await readCentre(page);
        await dragTo(page, centre, 47 * Math.PI / 180);
        await expect.poll(() => readProperties(page, ['angleVariable'])).toEqual({ angleVariable: 60 });
        await dragTo(page, centre, 100 * Math.PI / 180);
        await expect.poll(() => readProperties(page, ['angleVariable'])).toEqual({ angleVariable: 90 });
    });

    // A part of the circle is that part exactly, and stays it: rounding a third of a turn the way every
    // other dragged value is rounded would leave it holding 1.05, and the reading could no longer say
    // which part of the turn it is. So a circle asked for twelve parts is dragged round the angles a
    // reader knows, and reads each of them as the portion of π it is.
    test('an angle dragged onto a part of the circle is read as the portion of a turn it is', async ({ page }) => {
        await setupBoard(page);
        await addCircle(page, { angleVariable: '0', snapDivisions: 12 });
        await showReadings(page, ['angleVariable']);
        const centre = await readCentre(page);
        for (const [pointed, written] of [[32, '\\frac{\\pi}{6}'], [47, '\\frac{\\pi}{3}'], [88, '\\frac{\\pi}{2}'], [130, '\\frac{2\\pi}{3}']]) {
            await dragTo(page, centre, pointed * Math.PI / 180);
            await expect.poll(() => readAngleReading(page)).toBe(` = ${written}`);
        }
    });

    // A drag the object was asked to snap nowhere lands wherever the pointer left it, and that is
    // rounded the way every dragged value is — but in the unit the reader reads it in, so a drag to
    // the top of the circle is a round portion of π rather than a round number of radians.
    test('a dragged angle is rounded in the portion of π it is read as', async ({ page }) => {
        await setupBoard(page);
        await addCircle(page, { angleVariable: '0' });
        await showReadings(page, ['angleVariable']);
        const centre = await readCentre(page);
        await dragTo(page, centre, 90 * Math.PI / 180);
        await expect.poll(() => readAngleReading(page)).toBe(' = \\frac{\\pi}{2}');
        await expect.poll(() => readProperties(page, ['angleVariable']).then(read => read.angleVariable)).toBeCloseTo(Math.PI / 2, 9);
    });

    // The radius is the circle's own until the object says the drag may stretch it, so a reader
    // exploring the trigonometric circle cannot pull it off the unit it is read on by accident.
    test('a circle the drag may not stretch keeps the radius it was given', async ({ page }) => {
        await setupBoard(page);
        await addCircle(page, { angleVariable: '0', radiusVariable: '1', range: 3 });
        const centre = await readCentre(page);
        await dragTo(page, centre, Math.PI / 2, 0.5);
        await expect.poll(() => readProperties(page, ['angleVariable', 'radiusVariable'])).toEqual({ angleVariable: 1.57079632679, radiusVariable: 1 });
    });

    test('a circle the drag may stretch is written as far out as the pointer stands', async ({ page }) => {
        await setupBoard(page);
        await addCircle(page, { angleVariable: '0', radiusVariable: '1', range: 3, dragRadius: true });
        const centre = await readCentre(page);
        await dragTo(page, centre, Math.PI / 2, 0.5);
        await expect.poll(() => readProperties(page, ['angleVariable', 'radiusVariable'])).toEqual({ angleVariable: 1.57079632679, radiusVariable: 0.5 });
    });

    // Every reading is asked for on its own, the way the two halves of a turning-and-stretching drag
    // are: a circle whose angle the model works out for itself is still dragged where it can write
    // the pair, and only one that can write nothing at all refuses the pointer.
    test('a reading the model works out for itself is left alone and the rest are still written', async ({ page }) => {
        await setupBoard(page);
        await addCircleModel(page);
        await addCircle(page, { angleVariable: 'turned', pointXVariable: 'across', pointYVariable: 'up' });
        const centre = await readCentre(page);
        await dragTo(page, centre, Math.PI / 2);
        await expect.poll(() => readTerms(page, ['turned', 'across', 'up'])).toEqual({ turned: 0.5, across: 0, up: 1 });
    });

    test('a circle that can write nothing at all refuses the pointer', async ({ page }) => {
        await setupBoard(page);
        await addCircleModel(page);
        await addCircle(page, {
            angleVariable: 'turned',
            radiusVariable: 'turned',
            pointXVariable: 'computedAcross',
            pointYVariable: 'computedUp',
            tangentVariable: 'turned',
            arcVariable: 'turned'
        });
        expect((await readNode(page, 'point-grab')).style).toContain('not-allowed');
    });

    // A part of the construction goes by the name the reader gave it. The name it goes by in the
    // mathematics is only what it is called until a row names it.
    // There is a switch for each part and a colour for each part, and the two do different things: the
    // switch says whether it is drawn, the colour says what it is drawn in.
    test('each part has a switch of its own in the settings', async ({ page }) => {
        await setupBoard(page);
        await addCircle(page, { angleVariable: '0.9' });
        await expect(page.locator('[data-source-id="tangent-hypotenuse"]')).toHaveCount(0);
        await page.evaluate(() => shell.board.selection.select(shell.board.shapes.getByName('Circle')));
        await page.locator('.shape-context-toolbar.visible .mdl-component-settings-selector').click();
        const menu = page.locator('.mdl-shape-overlay-popup').last();
        // Every number the object writes is a reading the board writes for it, so there is no notation
        // of the object's own to choose.
        await expect(menu.locator('.mdl-dropdown-list-label')).toHaveText([
            'Angle unit', 'Snap to parts', 'Drag the radius', 'Grid', 'Axes', 'Angle', 'Radius', 'Sine', 'Cosine', 'Tangent', 'Arc'
        ]);
        const row = menu.locator('.mdl-dropdown-list-item').filter({ has: page.locator('.mdl-dropdown-list-label', { hasText: /^Tangent$/ }) });
        await row.locator('.dx-switch').click();
        await expect(page.locator('[data-source-id="tangent-hypotenuse"]')).toHaveCount(1);
        expect(await page.evaluate(() => shell.board.shapes.getByName('Circle').properties.showTangent)).toBe(true);
    });

    // An angle in radians is written as the portion of π it is — a half, a third, the ones a reader
    // knows by heart — with π a space after it; one in degrees carries the degree mark the same way.
    // What the row holds is the angle itself either way, so the mark is a way of reading and nothing
    // more.
    test('an angle is written in the unit the object is marked in', async ({ page }) => {
        await setupBoard(page);
        await addCircle(page, { angleVariable: '1.5707963268' });
        await showReadings(page, ['angleVariable']);
        expect(await readAngleReading(page)).toBe(' = \\frac{\\pi}{2}');
        await chooseAngleUnit(page, 'degrees');
        await expect.poll(() => readAngleReading(page)).toBe(' = 90.00 \u00ba');
    });

    // An angle that is no portion a reader knows is written as the decimal portion it is, so the
    // reading never pretends to a fraction that is not there.
    test('an angle that is no well known portion is written as the portion it is', async ({ page }) => {
        await setupBoard(page);
        await addCircle(page, { angleVariable: '0.9' });
        await showReadings(page, ['angleVariable']);
        expect(await readAngleReading(page)).toBe(' = 0.286\\pi');
    });

    // The mark says how the angle is written, never what it is, so changing it leaves the point where
    // it stands and leaves what the row holds exactly as it was.
    test('changing the unit leaves the angle where it is', async ({ page }) => {
        await setupBoard(page);
        await addCircle(page, { angleVariable: '1.5707963268' });
        const quarterTurn = await readPointCentre(page);
        await chooseAngleUnit(page, 'degrees');
        expect(await page.evaluate(() => shell.board.shapes.getByName('Circle').properties.angleVariable)).toBe('1.5707963268');
        expect(await readPointCentre(page)).toEqual(quarterTurn);
        await chooseAngleUnit(page, 'radians');
        expect(await readPointCentre(page)).toEqual(quarterTurn);
    });

    // A term is the model's to hold, in the unit the model keeps its angles in, so the object never
    // rewrites one and never reads one as something else: the mark it wears moves nothing.
    test('a term the row names is left as the model wrote it, and stays where it was', async ({ page }) => {
        await setupBoard(page);
        await addCircleModel(page);
        await addCircle(page, { angleVariable: 'theta' });
        await page.evaluate(() => {
            shell.board.calculator.setTermValue('theta', 1.5707963268, 1, 1);
            shell.board.calculator.calculate();
            shell.board.forceRefresh();
        });
        await expect.poll(() => page.evaluate(() => shell.board.shapes.getByName('Circle').lastCompilation?.componentFrame?.angleWrapped ?? 0)).toBeCloseTo(Math.PI / 2, 6);
        const quarterTurn = await readPointCentre(page);
        await chooseAngleUnit(page, 'degrees');
        expect(await page.evaluate(() => Number(shell.board.calculator.getByName('theta', 1)))).toBeCloseTo(1.5707963268, 9);
        expect(await page.evaluate(() => shell.board.shapes.getByName('Circle').properties.angleVariable)).toBe('theta');
        expect(await readPointCentre(page)).toEqual(quarterTurn);
    });

    // The row spells a plain value in the unit the object is marked in — the portion of π it is, or
    // the degrees — and reads back what is typed there the same way, while what it holds stays the
    // angle itself, in the unit the model counts angles in.
    test('the row writes a plain angle in the unit it is marked in', async ({ page }) => {
        await setupBoard(page);
        await addCircle(page, { angleVariable: '1.5707963268' });
        expect(await readAngleChip(page)).toEqual({ value: '\\frac{\\pi}{2}', suffix: '' });
        await chooseAngleUnit(page, 'degrees');
        expect(await readAngleChip(page)).toEqual({ value: '90', suffix: '\u00ba' });
    });

    // A model counting its angles in degrees hands the object degrees, and the row marked in radians
    // still writes the portion of π that angle is.
    test('the portion is the portion of a turn, whatever the model counts angles in', async ({ page }) => {
        await setupBoard(page);
        await setModelAngleUnit(page, 'degrees');
        await addCircle(page, { angleVariable: '90' });
        expect(await readAngleChip(page)).toEqual({ value: '\\frac{\\pi}{2}', suffix: '' });
        await showReadings(page, ['angleVariable']);
        expect(await readAngleReading(page)).toBe(' = \\frac{\\pi}{2}');
    });

    // The view follows the circle, so a radius the model changes keeps the same picture. A circle the
    // reader may stretch is the exception: a view that resized itself under the drag would scale the
    // radius straight back to the size it started at, so that one holds still and the circle grows.
    test('the view fits the circle, and holds still where the circle can be stretched', async ({ page }) => {
        await setupBoard(page);
        const fittedSmall = await buildDrawing(page, { radiusVariable: '1' });
        const fittedLarge = await buildDrawing(page, { radiusVariable: '4' });
        const heldSmall = await buildDrawing(page, { radiusVariable: '1', dragRadius: true });
        const heldLarge = await buildDrawing(page, { radiusVariable: '4', dragRadius: true });
        expect(Number(fittedLarge.nodes.circle.attributes.r)).toBe(Number(fittedSmall.nodes.circle.attributes.r));
        expect(Number(heldLarge.nodes.circle.attributes.r)).toBeCloseTo(Number(heldSmall.nodes.circle.attributes.r) * 4, 6);
    });

    test('nothing is drawn outside the box the object reports as its own', async ({ page }) => {
        await setupBoard(page);
        const drawing = await buildDrawing(page, { angleVariable: '1.45', showTangent: true, showArc: true });
        expect(drawing.errors).toEqual([]);
        expect(drawing.markup).toContain('viewBox="8 8 264 264" overflow="hidden"');
    });
});
