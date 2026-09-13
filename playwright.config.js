const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './tests',
    // Component markup snapshots are byte-identical on every platform, so they are kept
    // under one name; the pixel screenshots carry the platform in the name they ask for.
    snapshotPathTemplate: '{snapshotDir}/{testFileDir}/{testFileName}-snapshots/{arg}{ext}',
    timeout: 30000,
    fullyParallel: true,
    workers: process.env.CI ? 4 : 8,
    retries: process.env.CI ? 2 : 0,
    use: {
        browserName: 'chromium',
        headless: true,
    },
    webServer: {
        // tests/server.js serves the repo and answers the pages' CDN links from the copies
        // vendored under libraries/, so a run never waits on the public internet.
        command: 'node tests/server.js 8432',
        port: 8432,
        reuseExistingServer: true,
    },
});
