const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './tests',
    timeout: 30000,
    fullyParallel: true,
    workers: process.env.CI ? 4 : 8,
    retries: process.env.CI ? 2 : 0,
    use: {
        browserName: 'chromium',
        headless: true,
    },
    webServer: {
        command: 'npx http-server . -p 8432 -c-1 --silent',
        port: 8432,
        reuseExistingServer: true,
    },
});
