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

test('a model reset requested by the agent keeps the chat open and the turn alive', async ({ page }) => {
    await setupEditor(page);
    await page.evaluate(() => shell.chatController.open());
    await page.waitForSelector('.mdl-chat-popup .dx-chat-textarea textarea');

    const result = await page.evaluate(async () => {
        const controller = shell.chatController;
        const sentResults = [];
        controller.adapter.sendToolResult = (toolCallId, toolName, output, state, errorText) => sentResults.push({ toolCallId, toolName, state, errorText });
        const adapterBefore = controller.adapter;
        const threadBefore = controller.threadIdRef.value;
        modellus.shape.addChart('Chart1');
        await controller.executeToolCall({ toolCallId: 'tc-new', toolName: 'modellus_file_new', input: {} });
        return {
            open: controller.isOpen(),
            sameAdapter: controller.adapter === adapterBefore,
            adapterDestroyed: controller.adapter.destroyed,
            threadUnchanged: controller.threadIdRef.value === threadBefore,
            sentResults,
            shapes: shell.board.shapes.shapes.length,
            toolCallDepth: controller.toolCallDepth
        };
    });

    expect(result.open).toBe(true);
    expect(result.sameAdapter).toBe(true);
    expect(result.adapterDestroyed).toBe(false);
    expect(result.threadUnchanged).toBe(true);
    expect(result.sentResults).toEqual([{ toolCallId: 'tc-new', toolName: 'modellus_file_new', state: 'output-available', errorText: undefined }]);
    expect(result.shapes).toBe(0);
    expect(result.toolCallDepth).toBe(0);
});

test('the agent can add a chart without the chat closing', async ({ page }) => {
    await setupEditor(page);
    await page.evaluate(() => shell.chatController.open());
    await page.waitForSelector('.mdl-chat-popup .dx-chat-textarea textarea');

    const result = await page.evaluate(async () => {
        const controller = shell.chatController;
        const sentResults = [];
        controller.adapter.sendToolResult = (toolCallId, toolName, output, state, errorText) => sentResults.push({ toolName, state, errorText });
        await controller.executeToolCall({ toolCallId: 'tc-new', toolName: 'modellus_file_new', input: {} });
        await controller.executeToolCall({ toolCallId: 'tc-chart', toolName: 'modellus_shape_addChart', input: { name: 'Position Chart' } });
        return {
            open: controller.isOpen(),
            states: sentResults.map(r => `${r.toolName}:${r.state}`),
            shapes: shell.board.shapes.shapes.map(shape => shape.properties.name)
        };
    });

    expect(result.open).toBe(true);
    expect(result.states).toEqual(['modellus_file_new:output-available', 'modellus_shape_addChart:output-available']);
    expect(result.shapes).toEqual(['Position Chart']);
});

test('a user-initiated model reset still clears and hides the chat', async ({ page }) => {
    await setupEditor(page);
    await page.evaluate(() => shell.chatController.open());
    await page.waitForSelector('.mdl-chat-popup .dx-chat-textarea textarea');

    const result = await page.evaluate(() => {
        const controller = shell.chatController;
        const threadBefore = controller.threadIdRef.value;
        shell.clear();
        return {
            open: controller.isOpen(),
            threadChanged: controller.threadIdRef.value !== threadBefore
        };
    });

    expect(result.open).toBe(false);
    expect(result.threadChanged).toBe(true);
});
