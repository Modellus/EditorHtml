const { chromium } = require('@playwright/test');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, '..', 'docs', 'screenshots');
const BASE_URL = 'http://localhost:8432';

async function setupEditor(page) {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto(`${BASE_URL}/pages/board/index.html`);
    await page.waitForFunction(() => typeof shell !== 'undefined' && shell !== null && shell.board !== null, null, { timeout: 15000 });
    await page.waitForTimeout(1000);
}

async function clearBoard(page) {
    await page.evaluate(() => shell.clear());
    await page.waitForTimeout(500);
}

async function deselect(page) {
    await page.evaluate(() => shell.board.selection.deselect());
    await page.waitForTimeout(300);
}

async function screenshot(page, name, options = {}) {
    const filePath = path.join(SCREENSHOTS_DIR, `${name}.png`);
    if (options.element) {
        const element = await page.locator(options.element).first();
        await element.screenshot({ path: filePath, scale: 'device' });
    } else {
        await page.screenshot({ path: filePath, fullPage: false, scale: 'device' });
    }
    console.log(`  ✓ ${name}.png`);
}

async function captureEditorOverview(page) {
    console.log('Capturing editor overview...');
    await clearBoard(page);
    await page.evaluate(() => {
        modellus.shape.addExpression('Expr1');
        modellus.shape.setProperties('Expr1', {
            expression: '\\displaylines{g=9.8\\\\v_0=20\\\\\\frac{dx}{dt}=v_0-g\\cdot t}'
        });
    });
    await page.waitForTimeout(500);
    await page.evaluate(() => {
        modellus.shape.addReferential('Ref1');
        modellus.shape.addPoint('Point1', 'Ref1');
    });
    await page.waitForTimeout(500);
    await page.evaluate(() => {
        modellus.shape.addChart('Chart1');
    });
    await page.waitForTimeout(500);
    await deselect(page);
    await screenshot(page, 'editor-overview');
}

async function captureExpressionShape(page) {
    console.log('Capturing expression shape...');
    await clearBoard(page);
    await page.evaluate(() => {
        modellus.shape.addExpression('Expr1');
        modellus.shape.setProperties('Expr1', {
            expression: '\\displaylines{g=9.8\\\\v_0=20\\\\\\theta=45\\\\v_x=v_0\\cdot\\cos\\left(\\theta\\right)\\\\v_y=v_0\\cdot\\sin\\left(\\theta\\right)-g\\cdot t}'
        });
    });
    await page.waitForTimeout(600);
    await deselect(page);

    const expressionEl = await page.locator('.expression-shape').first();
    if (await expressionEl.count() > 0) {
        await expressionEl.screenshot({ path: path.join(SCREENSHOTS_DIR, 'expression-overview.png'), scale: 'device' });
        console.log('  ✓ expression-overview.png');
    } else {
        await screenshot(page, 'expression-overview');
    }

    await page.evaluate(() => modellus.shape.select('Expr1'));
    await page.waitForTimeout(500);
    await screenshot(page, 'expression-selected');

    const toolbar = await page.locator('.dx-toolbar').first();
    if (await toolbar.count() > 0) {
        await toolbar.screenshot({ path: path.join(SCREENSHOTS_DIR, 'expression-toolbar.png'), scale: 'device' });
        console.log('  ✓ expression-toolbar.png');
    }
}

async function captureTableShape(page) {
    console.log('Capturing table shape...');
    await clearBoard(page);
    await page.evaluate(() => {
        modellus.shape.addExpression('Expr1');
        modellus.shape.setProperties('Expr1', {
            expression: '\\displaylines{x=2\\cdot t\\\\y=5\\cdot t-0.5\\cdot9.8\\cdot t^{2}}'
        });
    });
    await page.waitForTimeout(400);
    await page.evaluate(() => {
        modellus.shape.addTable('Table1');
        modellus.shape.setProperties('Table1', {
            columns: [
                { term: 't', case: 1, color: 'transparent' },
                { term: 'x', case: 1, color: 'transparent' },
                { term: 'y', case: 1, color: 'transparent' }
            ]
        });
    });
    await page.waitForTimeout(600);
    await deselect(page);

    const tableEl = await page.locator('.table-shape').first();
    if (await tableEl.count() > 0) {
        await tableEl.screenshot({ path: path.join(SCREENSHOTS_DIR, 'table-overview.png'), scale: 'device' });
        console.log('  ✓ table-overview.png');
    } else {
        await screenshot(page, 'table-overview');
    }
}

async function captureChartShape(page) {
    console.log('Capturing chart shape...');
    await clearBoard(page);
    await page.evaluate(() => {
        modellus.shape.addExpression('Expr1');
        modellus.shape.setProperties('Expr1', {
            expression: '\\displaylines{x=\\cos\\left(t\\right)\\\\y=\\sin\\left(t\\right)}'
        });
    });
    await page.waitForTimeout(400);
    await page.evaluate(() => {
        modellus.shape.addChart('Chart1');
        modellus.shape.setProperties('Chart1', {
            series: [{ xTerm: 'x', yTerm: 'y', case: 1 }]
        });
    });
    await page.waitForTimeout(800);
    await deselect(page);

    const chartEl = await page.locator('.chart-shape').first();
    if (await chartEl.count() > 0) {
        await chartEl.screenshot({ path: path.join(SCREENSHOTS_DIR, 'chart-overview.png'), scale: 'device' });
        console.log('  ✓ chart-overview.png');
    } else {
        await screenshot(page, 'chart-overview');
    }
}

async function captureReferentialWithShapes(page) {
    console.log('Capturing referential with child shapes...');
    await clearBoard(page);
    await page.evaluate(() => {
        modellus.shape.addExpression('Expr1');
        modellus.shape.setProperties('Expr1', {
            expression: '\\displaylines{x=3\\cdot\\cos\\left(t\\right)\\\\y=3\\cdot\\sin\\left(t\\right)}'
        });
    });
    await page.waitForTimeout(400);
    await page.evaluate(() => {
        modellus.shape.addReferential('Ref1');
        modellus.shape.addPoint('Point1', 'Ref1');
        modellus.shape.setProperties('Point1', { xTerm: 'x', yTerm: 'y' });
    });
    await page.waitForTimeout(600);
    await deselect(page);

    const refEl = await page.locator('.referential-shape').first();
    if (await refEl.count() > 0) {
        await refEl.screenshot({ path: path.join(SCREENSHOTS_DIR, 'referential-overview.png'), scale: 'device' });
        console.log('  ✓ referential-overview.png');
    } else {
        await screenshot(page, 'referential-overview');
    }
}

async function captureSlider(page) {
    console.log('Capturing slider shape...');
    await clearBoard(page);
    await page.evaluate(() => {
        modellus.shape.addExpression('Expr1');
        modellus.shape.setProperties('Expr1', {
            expression: '\\displaylines{A=5\\\\y=A\\cdot\\sin\\left(t\\right)}'
        });
    });
    await page.waitForTimeout(400);
    await page.evaluate(() => {
        modellus.shape.addTable('Slider1');
    });
    await page.waitForTimeout(600);
    await deselect(page);
    await screenshot(page, 'slider-overview');
}

async function captureFullModel(page) {
    console.log('Capturing full model demo...');
    await clearBoard(page);
    await page.evaluate(() => {
        modellus.shape.addExpression('Expr1');
        modellus.shape.setProperties('Expr1', {
            expression: '\\displaylines{g=9.8\\\\v_0=15\\\\\\frac{dx}{dt}=v_0\\\\\\frac{dy}{dt}=v_0-g\\cdot t}'
        });
    });
    await page.waitForTimeout(400);
    await page.evaluate(() => {
        modellus.shape.addReferential('Ref1');
        modellus.shape.addPoint('Point1', 'Ref1');
        modellus.shape.setProperties('Point1', { xTerm: 'x', yTerm: 'y' });
    });
    await page.waitForTimeout(400);
    await page.evaluate(() => {
        modellus.shape.addChart('Chart1');
        modellus.shape.setProperties('Chart1', {
            series: [{ xTerm: 'x', yTerm: 'y', case: 1 }]
        });
    });
    await page.waitForTimeout(400);
    await page.evaluate(() => {
        modellus.shape.addTable('Table1');
        modellus.shape.setProperties('Table1', {
            columns: [
                { term: 't', case: 1, color: 'transparent' },
                { term: 'x', case: 1, color: 'transparent' },
                { term: 'y', case: 1, color: 'transparent' }
            ]
        });
    });
    await page.waitForTimeout(600);
    await deselect(page);
    await screenshot(page, 'full-model-demo');
}

async function captureCatalog(page) {
    console.log('Capturing catalog...');
    await page.goto(`${BASE_URL}/pages/catalog/index.html`);
    await page.waitForTimeout(3000);

    await screenshot(page, 'marketplace-overview');

    const sidebar = await page.locator('.drawer-panel, #drawer').first();
    if (await sidebar.isVisible())
        await sidebar.screenshot({ path: path.join(SCREENSHOTS_DIR, 'marketplace-sidebar.png'), scale: 'device' });
    console.log('  ✓ marketplace-sidebar.png');

    const cardView = await page.locator('.card-view, #models-card-view').first();
    if (await cardView.isVisible())
        await cardView.screenshot({ path: path.join(SCREENSHOTS_DIR, 'marketplace-cards.png'), scale: 'device' });
    console.log('  ✓ marketplace-cards.png');
}

(async () => {
    console.log('Starting screenshot capture...\n');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 2
    });
    const page = await context.newPage();

    try {
        await setupEditor(page);
        await captureEditorOverview(page);
        await captureExpressionShape(page);
        await captureTableShape(page);
        await captureChartShape(page);
        await captureReferentialWithShapes(page);
        await captureFullModel(page);
        await captureCatalog(page);
        console.log('\nAll screenshots captured successfully!');
    } catch (error) {
        console.error('Error capturing screenshots:', error.message);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'error-state.png') });
    } finally {
        await browser.close();
    }
})();
