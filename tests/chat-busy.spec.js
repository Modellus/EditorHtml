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

test('message box is disabled and stop button replaces send while busy', async ({ page }) => {
    await setupEditor(page);
    await page.evaluate(() => shell.chatController.open());
    await page.waitForSelector('.mdl-chat-popup .dx-chat-textarea textarea');
    const textarea = page.locator('.mdl-chat-popup .dx-chat-textarea textarea');
    const stopBar = page.locator('.mdl-chat-stop-button');
    const sendButton = page.locator('.mdl-chat-popup .dx-chat-textarea-toolbar .dx-toolbar-after .dx-toolbar-item:not(.mdl-chat-stop-item) .dx-button');
    await expect(textarea).toBeEnabled();
    await expect(stopBar).toBeHidden();
    await expect(sendButton).toBeVisible();

    await page.evaluate(() => shell.chatController.setBusy(true));
    await expect(textarea).toBeDisabled();
    await expect(stopBar).toBeVisible();
    await expect(sendButton).toBeHidden();
    expect(await page.locator('.mdl-chat-popup .dx-chat-textarea .dx-texteditor-container').first().evaluate(e => e.classList.contains('dx-state-disabled'))).toBe(true);

    await page.evaluate(() => shell.chatController.setBusy(false));
    await expect(textarea).toBeEnabled();
    await expect(stopBar).toBeHidden();
    await expect(sendButton).toBeVisible();

    // A repaint rebuilds the message box toolbar, so the stop button must be re-injected
    // exactly once and stay in the send button's slot.
    await page.evaluate(() => {
        shell.chatController.setBusy(true);
        shell.chatController.handlePopupResize();
    });
    await expect(stopBar).toBeVisible();
    await expect(sendButton).toBeHidden();
    expect(await page.locator('.mdl-chat-stop-item').count()).toBe(1);
    await page.evaluate(() => shell.chatController.setBusy(false));

    await page.evaluate(async () => {
        shell.chatController.disposeAdapter();
        window.sentPayloads = [];
        const adapter = new AgentChatAdapter({
            host: 'h', agent: 'a', name: 'n',
            chat: shell.chatController.instance,
            user: { id: '1', name: 'User' },
            assistant: { id: '2', name: 'Modellus' },
            initialItems: [],
            debugEnabled: false,
            onBusyChange: busy => shell.chatController.setBusy(busy)
        });
        adapter.connect = async () => {};
        adapter.initialMessagesLoaded = true;
        adapter.connection = { readyState: 1, send: payload => window.sentPayloads.push(JSON.parse(payload)) };
        shell.chatController.adapter = adapter;
        await adapter.sendMessage('hello from the test');
    });
    await expect(textarea).toBeDisabled();
    await expect(stopBar).toBeVisible();
    await page.locator('.mdl-chat-stop-button').click();
    await expect(stopBar).toBeHidden();
    await expect(textarea).toBeEnabled();
    expect(await page.evaluate(() => window.sentPayloads.some(p => p.type === 'cf_agent_chat_request_cancel'))).toBe(true);
});

test('adapter busy state machine and cancel', async ({ page }) => {
    await setupEditor(page);
    const result = await page.evaluate(async () => {
        const busyLog = [];
        const sent = [];
        const adapter = new AgentChatAdapter({
            host: 'h', agent: 'a', name: 'n',
            chat: { option: () => {} },
            user: { id: '1', name: 'User' },
            assistant: { id: '2', name: 'Bot' },
            initialItems: [],
            debugEnabled: false,
            onBusyChange: busy => busyLog.push(busy)
        });
        adapter.connect = async () => {};
        adapter.initialMessagesLoaded = true;
        adapter.connection = { readyState: 1, send: payload => sent.push(JSON.parse(payload)) };
        await adapter.sendMessage('hello');
        const busyAfterSend = adapter.busy;
        await adapter.sendMessage('second while busy');
        const requestCount = sent.filter(m => m.type === 'cf_agent_use_chat_request').length;
        const requestId = sent[0].id;
        adapter.handleUseChatResponseMessage({ id: requestId, body: JSON.stringify({ type: 'text-delta', delta: 'part' }) });
        const busyDuringStream = adapter.busy;
        adapter.cancel();
        const busyAfterCancel = adapter.busy;
        const cancelSent = sent.some(m => m.type === 'cf_agent_chat_request_cancel' && m.id === requestId);
        adapter.handleUseChatResponseMessage({ id: requestId, body: JSON.stringify({ type: 'text-delta', delta: 'IGNORED' }) });
        const assistantText = adapter.chatItems.filter(i => i.author.id === '2').map(i => i.text).join('');
        adapter.handleUseChatResponseMessage({ id: requestId, done: true, body: '' });
        const busyAfterDone = adapter.busy;
        await adapter.sendMessage('after cancel');
        const requestCountAfterCancel = sent.filter(m => m.type === 'cf_agent_use_chat_request').length;
        return { busyLog, busyAfterSend, requestCount, busyDuringStream, busyAfterCancel, cancelSent, assistantText, busyAfterDone, requestCountAfterCancel };
    });
    expect(result.busyAfterSend).toBe(true);
    expect(result.requestCount).toBe(1);
    expect(result.busyDuringStream).toBe(true);
    expect(result.busyAfterCancel).toBe(false);
    expect(result.cancelSent).toBe(true);
    expect(result.assistantText).toBe('part');
    expect(result.busyAfterDone).toBe(false);
    expect(result.requestCountAfterCancel).toBe(2);
    expect(result.busyLog).toEqual([true, false, true]);
});

test('tool call keeps the chat busy until the continuation completes', async ({ page }) => {
    await setupEditor(page);
    const result = await page.evaluate(async () => {
        const sent = [];
        let resolveTool;
        const adapter = new AgentChatAdapter({
            host: 'h', agent: 'a', name: 'n',
            chat: { option: () => {} },
            user: { id: '1', name: 'User' },
            assistant: { id: '2', name: 'Bot' },
            initialItems: [],
            debugEnabled: false,
            onClientToolCall: () => new Promise(resolve => { resolveTool = resolve; })
        });
        adapter.connect = async () => {};
        adapter.initialMessagesLoaded = true;
        adapter.connection = { readyState: 1, send: payload => sent.push(JSON.parse(payload)) };
        await adapter.sendMessage('build a model');
        const requestId = sent[0].id;
        adapter.handleUseChatResponseMessage({ id: requestId, body: JSON.stringify({ type: 'tool-input-available', toolCallId: 'tc1', toolName: 'modellus_undo', input: {} }) });
        adapter.handleUseChatResponseMessage({ id: requestId, done: true, body: '' });
        const busyAfterToolTurnDone = adapter.busy;
        adapter.sendToolResult('tc1', 'modellus_undo', null, 'output-available');
        const busyAfterToolResult = adapter.busy;
        adapter.handleUseChatResponseMessage({ id: 'req-2', continuation: true, body: JSON.stringify({ type: 'text-delta', delta: 'done' }) });
        const busyDuringContinuation = adapter.busy;
        adapter.handleUseChatResponseMessage({ id: 'req-2', done: true, body: '' });
        return { busyAfterToolTurnDone, busyAfterToolResult, busyDuringContinuation, busyAtEnd: adapter.busy, hasWatchdog: adapter.continuationTimeoutId !== null };
    });
    expect(result.busyAfterToolTurnDone).toBe(true);
    expect(result.busyAfterToolResult).toBe(true);
    expect(result.busyDuringContinuation).toBe(true);
    expect(result.busyAtEnd).toBe(false);
    expect(result.hasWatchdog).toBe(false);
});
