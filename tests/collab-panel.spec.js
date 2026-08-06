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

async function stubCollaborators(page, collaborators) {
    await page.evaluate(list => {
        shell.getCurrentModelId = () => 'model-1';
        shell.modelCreatorName = 'Ada Lovelace';
        shell.modelCreatorAvatar = '';
        window.__removedCollaborators = [];
        shell.session.modelsApiClient.fetchCollaborators = async () => list;
        shell.session.modelsApiClient.removeCollaborator = async (modelId, userId) => window.__removedCollaborators.push(userId);
    }, collaborators);
}

test('the collaboration panel is available to a user who is not the model creator', async ({ page }) => {
    await setupEditor(page);
    await stubCollaborators(page, [{ id: 'u1', name: 'Grace Hopper', avatar: '' }]);
    const result = await page.evaluate(async () => {
        shell.modelCreatorId = 'someone-else';
        shell.topToolbar.updateCollabButtonVisibility();
        const host = document.createElement('div');
        document.body.appendChild(host);
        shell.topToolbar._buildCollabDropdownContent(host);
        await new Promise(resolve => setTimeout(resolve, 200));
        return {
            buttonVisible: document.getElementById('collab-button-host').style.display !== 'none',
            isCreator: shell.isModelCreator(),
            hasSectionTitle: host.querySelector('.mdl-collab-section-title') != null,
            ownerShown: host.textContent.includes('Ada Lovelace'),
            collaboratorShown: host.textContent.includes('Grace Hopper'),
            hasRemoveButton: host.querySelector('.mdl-collab-remove-host') != null,
            hasAddRow: host.querySelector('.mdl-collab-add-row') != null,
            hasStopSharing: host.querySelector('.mdl-collab-stop-btn-host') != null
        };
    });
    expect(result.isCreator).toBe(false);
    expect(result.buttonVisible).toBe(true);
    expect(result.hasSectionTitle).toBe(true);
    expect(result.ownerShown).toBe(true);
    expect(result.collaboratorShown).toBe(true);
    expect(result.hasRemoveButton).toBe(false);
    expect(result.hasAddRow).toBe(false);
    expect(result.hasStopSharing).toBe(false);
});

test('the creator keeps the management panel and gains a stop sharing action', async ({ page }) => {
    await setupEditor(page);
    await stubCollaborators(page, [{ id: 'u1', name: 'Grace Hopper', avatar: '' }]);
    const result = await page.evaluate(async () => {
        shell.modelCreatorId = 'creator-1';
        shell.getCurrentUserId = () => 'creator-1';
        const host = document.createElement('div');
        document.body.appendChild(host);
        shell.topToolbar._buildCollabDropdownContent(host);
        await new Promise(resolve => setTimeout(resolve, 200));
        return {
            isCreator: shell.isModelCreator(),
            hasAddRow: host.querySelector('.mdl-collab-add-row') != null,
            hasStopSharing: host.querySelector('.mdl-collab-stop-btn-host') != null,
            stopSharingDisabled: shell.topToolbar._collabStopSharingInstance.option('disabled')
        };
    });
    expect(result.isCreator).toBe(true);
    expect(result.hasAddRow).toBe(true);
    expect(result.hasStopSharing).toBe(true);
    expect(result.stopSharingDisabled).toBe(false);
});

async function startStopSharing(page) {
    await page.evaluate(async () => {
        shell.modelCreatorId = 'creator-1';
        shell.getCurrentUserId = () => 'creator-1';
        const host = document.createElement('div');
        document.body.appendChild(host);
        shell.topToolbar._buildCollabDropdownContent(host);
        await new Promise(resolve => setTimeout(resolve, 200));
        window.__stopSharingPromise = shell.topToolbar._stopSharingModel();
    });
    await page.locator('.dx-dialog-wrapper').waitFor({ state: 'visible', timeout: 5000 });
}

async function finishStopSharing(page) {
    return page.evaluate(async () => {
        await window.__stopSharingPromise;
        return window.__removedCollaborators;
    });
}

test('stop sharing revokes every collaborator once confirmed', async ({ page }) => {
    await setupEditor(page);
    await stubCollaborators(page, [{ id: 'u1', name: 'Grace Hopper' }, { id: 'u2', name: 'Alan Turing' }]);
    await startStopSharing(page);
    await page.locator('.dx-dialog-wrapper .dx-button', { hasText: 'Stop sharing' }).click();
    expect(await finishStopSharing(page)).toEqual(['u1', 'u2']);
});

test('stop sharing does nothing when the confirmation is dismissed', async ({ page }) => {
    await setupEditor(page);
    await stubCollaborators(page, [{ id: 'u1', name: 'Grace Hopper' }]);
    await startStopSharing(page);
    await page.locator('.dx-dialog-wrapper .dx-button', { hasText: 'Cancel' }).click();
    expect(await finishStopSharing(page)).toEqual([]);
});

test('the confirmation names how many collaborators lose access', async ({ page }) => {
    await setupEditor(page);
    await stubCollaborators(page, [{ id: 'u1', name: 'Grace Hopper' }, { id: 'u2', name: 'Alan Turing' }]);
    await startStopSharing(page);
    await expect(page.locator('.dx-dialog-wrapper')).toContainText('This removes 2 collaborator(s)');
    await page.locator('.dx-dialog-wrapper .dx-button', { hasText: 'Cancel' }).click();
    await finishStopSharing(page);
});
