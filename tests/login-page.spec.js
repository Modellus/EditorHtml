const { test, expect } = require('@playwright/test');

const LOGIN_URL = '/pages/login/index.html';

// The sign-in page is the one page that carries DevExtreme itself rather than reaching for the
// copy on the CDN, and it named a stylesheet that is not the one on disk, so it had been loading
// none of the theme at all. Nothing was watching it, which is how the name stayed wrong: these
// hold it to asking only for files the repo actually has, and to ending up with the theme in force.
test('the sign-in page asks for nothing the repo does not have', async ({ page }) => {
    const missing = [];
    page.on('response', response => {
        if (response.status() >= 400 && new URL(response.url()).host === 'localhost:8432')
            missing.push(`${response.status()} ${new URL(response.url()).pathname}`);
    });
    await page.goto(LOGIN_URL);
    await page.waitForLoadState('domcontentloaded');
    expect(missing).toEqual([]);
});

test('the sign-in page is dressed in the DevExtreme theme it carries', async ({ page }) => {
    await page.goto(LOGIN_URL);
    await page.waitForFunction(() => typeof DevExpress !== 'undefined', null, { timeout: 15000 });
    // A stylesheet that failed to load is still listed, with no rules behind it, so the rules are
    // what is counted rather than the tag.
    const theme = await page.evaluate(() => Array.from(document.styleSheets)
        .filter(sheet => (sheet.href ?? '').includes('dx.fluent'))
        .map(sheet => {
            try {
                return sheet.cssRules.length;
            } catch (error) {
                return -1;
            }
        }));
    expect(theme.length, 'the page links a DevExtreme theme').toBe(1);
    expect(theme[0], 'the theme it links has rules behind it').toBeGreaterThan(0);
});
