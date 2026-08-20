const { chromium } = require('@playwright/test');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, '..', 'docs', 'screenshots');
const BASE_URL = 'http://localhost:8432';

const EQUATION_GROUPS = [
    { name: 'Parameters', expression: '\\displaylines{a=0.10\\\\b=21.55\\\\K_c=\\frac{b}{a^2}\\\\k_d=1\\\\k_i=\\frac{k_d}{K_c}}' },
    { name: 'Initial values', expression: '\\displaylines{r=2\\\\NO_2\\left(0\\right)=a\\cdot r\\\\N_2O_4\\left(0\\right)=b\\cdot r}' },
    { name: 'Rates', expression: '\\displaylines{v_d=k_d\\cdot NO_2^2\\\\v_i=k_i\\cdot N_2O_4\\\\\\frac{\\differentialD{NO_2}}{\\differentialD{t}}=2\\left(v_i-v_d\\right)\\\\\\frac{\\differentialD{N_2O_4}}{\\differentialD{t}}=v_d-v_i\\\\Q_c=\\frac{N_2O_4}{NO_2^2}}' }
];

async function setupEditor(page) {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto(`${BASE_URL}/pages/board/index.html`);
    await page.waitForFunction(() => typeof shell !== 'undefined' && shell !== null && shell.board !== null, null, { timeout: 15000 });
    await page.waitForTimeout(800);
}

async function addEquationGroups(page) {
    await page.evaluate(groups => {
        groups.forEach((group, groupIndex) => {
            modellus.shape.addExpression(group.name);
            const shape = shell.board.shapes.getByName(group.name);
            shape.properties.x = 40 + groupIndex * 420;
            shape.properties.y = 110;
            shape.properties.width = 380;
            shape.properties.height = 250;
            shape.setProperties({ expression: group.expression });
            shape.update();
            shape.draw();
        });
    }, EQUATION_GROUPS);
    await page.waitForTimeout(1200);
    await page.evaluate(() => shell.board.selection.deselect());
    await page.waitForTimeout(400);
}

async function capture(page, name) {
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${name}.png`), clip: { x: 20, y: 90, width: 1290, height: 290 } });
    console.log(`wrote ${path.join(SCREENSHOTS_DIR, `${name}.png`)}`);
}

async function main() {
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1340, height: 700 } });
    await setupEditor(page);
    await addEquationGroups(page);
    await capture(page, 'expression-semantics-light');
    await page.evaluate(() => {
        document.documentElement.dataset.theme = 'dark';
        document.body.style.background = '#1e1f22';
        shell.board.shapes.shapes.forEach(shape => {
            shape.properties.backgroundColor = '#1e1f22';
            shape.properties.foregroundColor = '#e6e6e6';
            shape.update();
            shape.expressionControl?.refreshSemanticColoring();
        });
    });
    await page.waitForTimeout(600);
    await capture(page, 'expression-semantics-dark');
    await browser.close();
}

main();
