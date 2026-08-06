const { test, expect } = require('@playwright/test');

const EDITOR_URL = '/pages/board/index.html';

async function setupEditor(page) {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'creator-1' }));
    });
    await page.goto(EDITOR_URL);
    await page.waitForFunction(() => typeof shell !== 'undefined' && shell !== null && shell.board !== null, null, { timeout: 15000 });
    await page.waitForTimeout(500);
}

async function markModelShared(page) {
    await page.evaluate(() => {
        shell.getCurrentModelId = () => 'model-1';
        shell.modelCreatorId = 'creator-1';
        shell.getCurrentUserId = () => 'creator-1';
        shell.topToolbar._collabCollaborators = [{ id: 'u1', name: 'Grace Hopper' }];
    });
}

async function readStatusPill(page, state) {
    return page.evaluate(collabState => {
        shell.topToolbar.updateCollabConnectionState(collabState);
        const pill = document.getElementById('collab-status');
        const style = window.getComputedStyle(pill);
        const icon = pill.querySelector('i');
        return {
            display: style.display,
            visible: pill.offsetWidth > 0 && pill.offsetHeight > 0,
            className: pill.className,
            text: pill.textContent.trim(),
            title: pill.title,
            iconClass: icon ? icon.className : '',
            iconAnimation: icon ? window.getComputedStyle(icon).animationName : ''
        };
    }, state);
}

test('the shared status pill is actually visible while collaborating', async ({ page }) => {
    await setupEditor(page);
    await markModelShared(page);
    const pill = await readStatusPill(page, 'live');
    expect(pill.display).not.toBe('none');
    expect(pill.visible).toBe(true);
    expect(pill.className).toContain('mdl-collab-status-live');
    expect(pill.text).toBe('Shared');
    expect(pill.iconClass).toContain('fa-circle');
    expect(pill.iconAnimation).toBe('collab-live-pulse');
    expect(pill.title).toContain('collaboration mode');
});

test('every connection state renders a visible pill', async ({ page }) => {
    await setupEditor(page);
    await markModelShared(page);
    for (const state of ['connecting', 'live', 'reconnecting', 'stopped']) {
        const pill = await readStatusPill(page, state);
        expect(pill.visible, `${state} pill should be visible`).toBe(true);
        expect(pill.className, `${state} pill should carry its state class`).toContain(`mdl-collab-status-${state}`);
        expect(pill.text.length, `${state} pill should have a label`).toBeGreaterThan(0);
        expect(pill.title.length, `${state} pill should have a hint`).toBeGreaterThan(0);
    }
});

test('the pill stays hidden until a collaboration session reports a state', async ({ page }) => {
    await setupEditor(page);
    const hidden = await page.evaluate(() => {
        const pill = document.getElementById('collab-status');
        return { display: window.getComputedStyle(pill).display, visible: pill.offsetWidth > 0 };
    });
    expect(hidden.display).toBe('none');
    expect(hidden.visible).toBe(false);
});

test('starting a session on a shared model shows the pill without any manual call', async ({ page }) => {
    await setupEditor(page);
    const state = await page.evaluate(async () => {
        shell.getCurrentModelId = () => 'model-1';
        shell.modelCreatorId = 'creator-1';
        shell.getCurrentUserId = () => 'creator-1';
        shell.session.modelsApiClient.fetchCollaborators = async () => [{ id: 'u1', name: 'Grace Hopper' }];
        shell.setupCollab('model-1');
        await new Promise(resolve => setTimeout(resolve, 300));
        const pill = document.getElementById('collab-status');
        return {
            display: window.getComputedStyle(pill).display,
            visible: pill.offsetWidth > 0 && pill.offsetHeight > 0,
            className: pill.className,
            text: pill.textContent.trim()
        };
    });
    expect(state.visible).toBe(true);
    expect(state.display).not.toBe('none');
    expect(state.className).toContain('mdl-collab-status-connecting');
    expect(state.text).toBe('Connecting…');
});

test('a private model the creator is alone in never shows the pill', async ({ page }) => {
    await setupEditor(page);
    const states = await page.evaluate(async () => {
        shell.getCurrentModelId = () => 'model-1';
        shell.modelCreatorId = 'creator-1';
        shell.getCurrentUserId = () => 'creator-1';
        shell.session.modelsApiClient.fetchCollaborators = async () => [];
        shell.setupCollab('model-1');
        await new Promise(resolve => setTimeout(resolve, 300));
        const pill = document.getElementById('collab-status');
        const results = {};
        for (const state of ['connecting', 'live', 'reconnecting', 'stopped']) {
            shell.topToolbar.updateCollabConnectionState(state);
            results[state] = { display: window.getComputedStyle(pill).display, visible: pill.offsetWidth > 0 };
        }
        return results;
    });
    for (const state of ['connecting', 'live', 'reconnecting', 'stopped']) {
        expect(states[state].display, `${state} must stay hidden on an unshared model`).toBe('none');
        expect(states[state].visible, `${state} must stay hidden on an unshared model`).toBe(false);
    }
});

test('sharing the model with someone reveals the pill', async ({ page }) => {
    await setupEditor(page);
    const result = await page.evaluate(async () => {
        shell.getCurrentModelId = () => 'model-1';
        shell.modelCreatorId = 'creator-1';
        shell.getCurrentUserId = () => 'creator-1';
        let collaborators = [];
        shell.session.modelsApiClient.fetchCollaborators = async () => collaborators;
        shell.setupCollab('model-1');
        await new Promise(resolve => setTimeout(resolve, 300));
        const pill = document.getElementById('collab-status');
        const before = pill.offsetWidth > 0;
        collaborators = [{ id: 'u1', name: 'Grace Hopper' }];
        await shell.topToolbar.refreshCollabSharingState();
        return { before, after: pill.offsetWidth > 0, text: pill.textContent.trim() };
    });
    expect(result.before).toBe(false);
    expect(result.after).toBe(true);
    expect(result.text).toBe('Connecting…');
});

test('a collaborator on someone else\'s model always sees the pill', async ({ page }) => {
    await setupEditor(page);
    const visible = await page.evaluate(async () => {
        shell.getCurrentModelId = () => 'model-1';
        shell.modelCreatorId = 'someone-else';
        shell.getCurrentUserId = () => 'creator-1';
        shell.session.modelsApiClient.fetchCollaborators = async () => { throw new Error('not allowed'); };
        shell.setupCollab('model-1');
        await new Promise(resolve => setTimeout(resolve, 300));
        const pill = document.getElementById('collab-status');
        return pill.offsetWidth > 0;
    });
    expect(visible).toBe(true);
});

test('another participant showing up reveals the pill even without an access list', async ({ page }) => {
    await setupEditor(page);
    const result = await page.evaluate(async () => {
        shell.getCurrentModelId = () => 'model-1';
        shell.modelCreatorId = 'creator-1';
        shell.getCurrentUserId = () => 'creator-1';
        shell.topToolbar._collabCollaborators = [];
        shell.topToolbar.updateCollabConnectionState('live');
        const pill = document.getElementById('collab-status');
        const before = pill.offsetWidth > 0;
        shell.topToolbar.updateCollaboratorPresence([{ name: 'Grace Hopper', color: '#e84c3d' }]);
        return { before, after: pill.offsetWidth > 0 };
    });
    expect(result.before).toBe(false);
    expect(result.after).toBe(true);
});
