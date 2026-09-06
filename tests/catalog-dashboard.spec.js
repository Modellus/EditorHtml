const { test, expect } = require('@playwright/test');

const CATALOG_URL = '/pages/catalog/index.html';
const API_GLOB = '**/modellus-api.interactivebook.workers.dev/**';

// Sign-ups from three countries, one of them from before the chart opens and one whose
// country was never given.
const USERS = [
    { id: 'user-1', name: 'Ana', email: 'ana@test', role: 'teacher', country: 'PT', createdAt: '2025-11-15T10:00:00Z' },
    { id: 'user-2', name: 'Bo', email: 'bo@test', role: 'student', country: 'BR', createdAt: '2026-01-01T18:00:00Z' },
    { id: 'user-3', name: 'Cai', email: 'cai@test', role: 'student', country: 'PT', createdAt: '2026-01-03T09:00:00Z' },
    { id: 'user-4', name: 'Dee', email: 'dee@test', role: 'student', country: '', createdAt: '2026-01-03T11:00:00Z' },
    { id: 'user-5', name: 'Eli', email: 'eli@test', role: 'teacher', country: 'ES', createdAt: '2026-01-05T11:00:00Z' }
];

async function stubCatalogApi(page) {
    await page.route(API_GLOB, route => {
        const path = new URL(route.request().url()).pathname;
        if (path.endsWith('/feature-flags'))
            return route.fulfill({ json: [{ key: 'can_access_maintenance', is_enabled: 1 }] });
        if (path === '/users')
            return route.fulfill({ json: USERS });
        if (/^\/users\/[^/]+$/.test(path))
            return route.fulfill({ json: { id: 'user-1', name: 'Ana', role: 'teacher', country: 'PT', preferredLanguage: 'en-US' } });
        if (path === '/models')
            return route.fulfill({ json: [] });
        if (path.endsWith('/facets'))
            return route.fulfill({ json: { education: [], sciences: [], categories: [], uncategorized: 0, total: 0 } });
        return route.fulfill({ json: [] });
    });
}

async function openDashboard(page) {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'user-1', exp: Math.floor(Date.now() / 1000) + 86400 }));
        localStorage.setItem('mp.user', JSON.stringify({ id: 'user-1', name: 'Ana', role: 'teacher', country: 'PT', preferredLanguage: 'en-US' }));
    });
    await page.goto(CATALOG_URL);
    await page.waitForSelector('.dx-treeview-item');
    await page.evaluate(() => {
        window.modelsApp.state.selectedTreeNodeId = 'maintenance-dashboard';
        window.modelsApp.renderCurrentTreeNode();
    });
    await page.waitForSelector('.usage-dashboard');
}

test.describe('maintenance dashboard', () => {
    test('the growth card charts users and countries per day from January 1, 2026 to today', async ({ page }) => {
        await stubCatalogApi(page);
        await openDashboard(page);
        await page.waitForSelector('#usage-growth-chart svg');
        const card = page.locator('.usage-breakdown-card', { hasText: 'Growth' }).first();
        expect(await card.textContent()).toContain('Users and countries per day since Jan 1, 2026');
        const series = await page.evaluate(() => window.modelsApp.dashboardGrowthChartInstance.getDataSource().items());
        const today = new Date();
        const expectedDays = Math.round((new Date(today.getFullYear(), today.getMonth(), today.getDate())
            - new Date(2026, 0, 1)) / 86400000) + 1;
        expect(series).toHaveLength(expectedDays);
        expect(new Date(series[0].date).getDate()).toBe(1);
        expect(new Date(series[0].date).getMonth()).toBe(0);
        // November's sign-up is already counted on the first day drawn, so no one is lost.
        expect(series.slice(0, 5).map(day => [day.users, day.countries])).toEqual([[2, 2], [2, 2], [4, 2], [4, 2], [5, 3]]);
        expect(series[series.length - 1].users).toBe(5);
        expect(series[series.length - 1].countries).toBe(3);
    });

    test('the card reads the average growth per day and draws it across the chart', async ({ page }) => {
        await stubCatalogApi(page);
        await openDashboard(page);
        await page.waitForSelector('#usage-growth-chart svg');
        const series = await page.evaluate(() => window.modelsApp.dashboardGrowthChartInstance.getDataSource().items());
        // Three of the five users arrived after the first day drawn, over the days since it.
        const expectedRate = 3 / (series.length - 1);
        const rate = await page.textContent('.usage-growth-rate');
        expect(rate.replace(/\s+/g, ' ')).toContain(`+${expectedRate.toFixed(2)} users / day`);
        expect(rate.replace(/\s+/g, ' ')).toContain(`+${(1 / (series.length - 1)).toFixed(2)} countries / day`);
        // The dashed line runs from the first day's total along that same slope.
        expect(series[0].averageUsers).toBeCloseTo(series[0].users, 6);
        expect(series[series.length - 1].averageUsers).toBeCloseTo(series[series.length - 1].users, 6);
        expect(series[1].averageUsers - series[0].averageUsers).toBeCloseTo(expectedRate, 6);
    });

    test('the chart is drawn once and goes away with the dashboard', async ({ page }) => {
        await stubCatalogApi(page);
        await openDashboard(page);
        await page.waitForSelector('#usage-growth-chart svg');
        await page.evaluate(() => {
            window.modelsApp.state.selectedTreeNodeId = 'maintenance-users';
            window.modelsApp.renderCurrentTreeNode();
        });
        expect(await page.evaluate(() => window.modelsApp.dashboardGrowthChartInstance)).toBeNull();
    });
});
