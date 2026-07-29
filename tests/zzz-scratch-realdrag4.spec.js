const { test } = require('@playwright/test');

async function svgClientPoint(page, x, y) {
    return page.evaluate(({ x, y }) => {
        const svg = document.getElementById('svg');
        const point = svg.createSVGPoint();
        point.x = x;
        point.y = y;
        const client = point.matrixTransform(svg.getScreenCTM());
        return { x: client.x, y: client.y };
    }, { x, y });
}

test('realistic label drag flow curved default fixed', async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.setViewportSize({ width: 900, height: 700 });
    await page.goto('/pages/board/index.html');
    await page.waitForFunction(() => typeof shell !== 'undefined' && shell !== null && shell.board !== null, null, { timeout: 15000 });
    await page.waitForTimeout(800);
    await page.evaluate(() => {
        const connector = shell.board.createShape('MindMapConnectorShape', null);
        connector.setProperties({ name: 'C1', startX: 100, startY: 300, endX: 400, endY: 300, routing: 'curved', text: 'because' });
        shell.board.addShape(connector, false);
        shell.board.forceRefresh();
    });
    await page.waitForTimeout(300);
    const onCurve = await page.evaluate(() => {
        const connector = shell.board.shapes.getByName('C1');
        const total = connector.path.getTotalLength();
        const p = connector.path.getPointAtLength(total * 0.2);
        return { x: p.x, y: p.y };
    });
    const linePoint = await svgClientPoint(page, onCurve.x, onCurve.y);
    await page.mouse.click(linePoint.x, linePoint.y);
    await page.waitForTimeout(300);
    const selectedAfterClick = await page.evaluate(() => shell.board.selection.selectedShape?.properties.name);
    console.log('selectedAfterClick', selectedAfterClick);
    const labelInfo = await page.evaluate(() => {
        const connector = shell.board.shapes.getByName('C1');
        const rect = connector.labelElement.getBoundingClientRect();
        return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
    });
    const labelCenterX = (labelInfo.left + labelInfo.right) / 2;
    const labelCenterY = (labelInfo.top + labelInfo.bottom) / 2;
    const elementAtLabel = await page.evaluate(({ x, y }) => {
        const el = document.elementFromPoint(x, y);
        return { tag: el?.tagName, className: el?.getAttribute?.('class') };
    }, { x: labelCenterX, y: labelCenterY });
    console.log('elementAtLabel', JSON.stringify(elementAtLabel));
    await page.mouse.move(labelCenterX, labelCenterY);
    await page.mouse.down();
    await page.mouse.move(labelCenterX + 100, labelCenterY, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => shell.board.shapes.getByName('C1').properties.textPosition);
    console.log('textPositionAfter', after);
    await page.screenshot({ path: '/private/tmp/claude-501/-Users-jpdv-Documents-Modellus-EditorHtml/84e19360-32bb-4fde-957a-a21da0653566/scratchpad/toolbar-fixed.png' });
});
