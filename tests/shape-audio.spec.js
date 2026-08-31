const { test, expect } = require('@playwright/test');

const BOARD_URL = '/pages/board/index.html';
const API_GLOB = '**/modellus-api.interactivebook.workers.dev/**';
const CLIP_URL = 'https://audio.test/tone.mp3';

// One catalogue audio the way the API hands it over, the same shape the audios branch serves.
const AUDIO_ENTRY = {
    id: 'aud-1',
    title: 'Tuning fork 440 Hz',
    description: 'A tuning fork sounding the A above middle C.',
    thumbnail_url: '',
    asset_url: 'https://modellus-api.interactivebook.workers.dev/audios/aud-1/asset',
    science_id: 'sci-1',
    education_level_id: null,
    created_at: '2026-08-01T10:00:00Z'
};

// An object definition that says it makes a noise: a value, the two ends of the scale it is read
// against, and the clip that follows it. It is registered on the page rather than shipped, because
// the point of the feature is that any catalogue object can declare one.
const SOUNDING_DIAL = {
    schemaVersion: '1.0.0',
    type: 'sounding-dial',
    category: 'component',
    displayName: 'Sounding dial',
    description: 'A dial that is heard as well as seen.',
    icon: 'fa-light fa-gauge',
    parameters: [
        { id: 'valueVariable', label: 'Value', valueType: 'variable', defaultValue: '0', category: 'model' },
        { id: 'minimum', label: 'Minimum', valueType: 'number', defaultValue: 0, category: 'scale' },
        { id: 'maximum', label: 'Maximum', valueType: 'number', defaultValue: 10, category: 'scale' },
        {
            id: 'engineSound', label: 'Engine', valueType: 'audio', defaultValue: '', category: 'sound',
            valueParameter: 'valueVariable', minimumParameter: 'minimum', maximumParameter: 'maximum'
        }
    ],
    locals: [{ id: 'w', value: { parameter: '$width' } }],
    root: {
        id: 'dial',
        type: 'group',
        children: [
            { id: 'face', type: 'circle', bindings: { centerX: { parameter: 'w' }, centerY: { parameter: 'w' }, radius: 10 } }
        ]
    }
};

async function setupBoard(page, audios = []) {
    await page.route(API_GLOB, route => {
        const path = new URL(route.request().url()).pathname;
        if (path === '/audios')
            return route.fulfill({ json: audios });
        return route.fulfill({ json: [] });
    });
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto(BOARD_URL);
    await page.waitForFunction(() => typeof shell !== 'undefined' && shell !== null && shell.board !== null, null, { timeout: 15000 });
}

// The sound is recorded rather than made: what matters here is which clip a shape reaches for, with
// what value, and how that value is meant to be heard.
async function recordPlayedSounds(page) {
    await page.evaluate(() => {
        window.playedSounds = [];
        ShapeAudioPlayer.prototype.play = function (value, modulation, minimum, maximum) {
            window.playedSounds.push({ url: this.url, value: value, modulation: modulation, minimum: minimum, maximum: maximum });
        };
    });
}

function readPlayedSounds(page) {
    return page.evaluate(() => window.playedSounds);
}

async function addValueShape(page, properties) {
    await page.evaluate(properties => {
        shell.commands.addShape('ValueShape', 'Value1');
        shell.commands.setShapeProperties('Value1', properties);
    }, properties);
    await page.waitForFunction(() => !!shell.board.shapes.getByName('Value1'));
}

async function openValueTermsMenu(page) {
    await page.evaluate(() => shell.board.selection.select(shell.board.shapes.getByName('Value1')));
    await expect(page.locator('.shape-context-toolbar.visible')).toBeVisible();
    await page.evaluate(() => shell.board.shapes.getByName('Value1')._termsDropdownElement.dxDropDownButton('instance').open());
    await page.waitForSelector('.mdl-audio-control');
}

test.describe('a shape heard as well as seen', () => {
    test('the value is spread over the window as a rate one way and as a loudness the other', async ({ page }) => {
        await setupBoard(page);
        const readings = await page.evaluate(() => ({
            bottom: ShapeAudio.getNormalizedValue(0, 0, 10),
            middle: ShapeAudio.getNormalizedValue(5, 0, 10),
            top: ShapeAudio.getNormalizedValue(10, 0, 10),
            beyond: ShapeAudio.getNormalizedValue(40, 0, 10),
            flatWindow: ShapeAudio.getNormalizedValue(3, 7, 7),
            defaultWindow: ShapeAudio.getNormalizedValue(0, null, null),
            slowest: ShapeAudio.getPlaybackRate(0),
            ownPitch: ShapeAudio.getPlaybackRate(0.5),
            fastest: ShapeAudio.getPlaybackRate(1),
            quietest: ShapeAudio.getVolume(0),
            loudest: ShapeAudio.getVolume(1)
        }));
        expect(readings.bottom).toBe(0);
        expect(readings.middle).toBe(0.5);
        expect(readings.top).toBe(1);
        // A value past the end of the window is heard at the end of it rather than off the scale.
        expect(readings.beyond).toBe(1);
        expect(readings.flatWindow).toBe(0.5);
        expect(readings.defaultWindow).toBe(0.5);
        expect(readings.slowest).toBeCloseTo(0.5, 6);
        expect(readings.ownPitch).toBeCloseTo(1, 6);
        expect(readings.fastest).toBeCloseTo(2, 6);
        expect(readings.quietest).toBe(0);
        expect(readings.loudest).toBe(1);
    });

    // The clip runs longer than one iteration of a model, so the second value has to steer the voice
    // that is already sounding. Starting it again would pile the clip on top of itself.
    test('a clip already sounding is steered rather than started again', async ({ page }) => {
        await setupBoard(page);
        const events = await page.evaluate(() => {
            const events = [];
            const audioParam = name => ({
                value: 0,
                setValueAtTime: value => events.push({ name: name, how: 'set', value: value }),
                setTargetAtTime: value => events.push({ name: name, how: 'steer', value: value })
            });
            ShapeAudio.getContext = () => ({ currentTime: 0, state: 'running' });
            ShapeAudio.getMasterGain = () => ({});
            ShapeAudio.getBuffer = () => ({ duration: 1 });
            const context = ShapeAudio.getContext();
            context.createGain = () => ({ gain: audioParam('gain'), connect: () => {} });
            context.createBufferSource = () => ({
                buffer: null,
                playbackRate: audioParam('rate'),
                connect: () => {},
                start: () => events.push({ name: 'source', how: 'start' }),
                stop: () => {},
                onended: null
            });
            ShapeAudio.getContext = () => context;
            const player = new ShapeAudioPlayer();
            player.setSource('https://audio.test/tone.mp3');
            player.play(0, 'pitch', 0, 100);
            player.play(100, 'pitch', 0, 100);
            player.play(50, 'volume', 0, 100);
            return events;
        });
        expect(events.filter(event => event.how === 'start')).toHaveLength(1);
        expect(events.find(event => event.name === 'rate' && event.how === 'set').value).toBeCloseTo(0.5, 6);
        expect(events.filter(event => event.name === 'rate' && event.how === 'steer').map(event => Math.round(event.value * 100) / 100)).toEqual([2, 1]);
        expect(events.filter(event => event.name === 'gain' && event.how === 'steer').map(event => event.value)).toEqual([1, 0.5]);
    });

    test('a value shape plays the clip it was given, and says what the value does to it', async ({ page }) => {
        await setupBoard(page);
        await recordPlayedSounds(page);
        await addValueShape(page, { term: 'x', soundAudio: CLIP_URL, soundAudioModulation: 'volume' });
        const sounds = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Value1');
            shape.updateValueSoundState(2, 'x', 1);
            shape.updateValueSoundState(6, 'x', 1);
            return window.playedSounds;
        });
        expect(sounds).toEqual([{ url: CLIP_URL, value: 6, modulation: 'volume', minimum: null, maximum: null }]);
    });

    // The clip is the whole of the sound now: a shape with none makes no noise however its value moves.
    test('a value shape with no clip stays silent', async ({ page }) => {
        await setupBoard(page);
        await addValueShape(page, { term: 'x' });
        const played = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Value1');
            const played = [];
            shape.playSoundForValue = value => played.push(value);
            shape.updateValueSoundState(2, 'x', 1);
            shape.updateValueSoundState(6, 'x', 1);
            return played;
        });
        expect(played).toEqual([]);
    });

    // The menu no longer holds a choice of instrument: a value is heard in the clip chosen for it or
    // not at all.
    test('the terms menu offers the audio row and no instrument', async ({ page }) => {
        await setupBoard(page, [AUDIO_ENTRY]);
        await addValueShape(page, { term: 'x' });
        await openValueTermsMenu(page);
        await expect(page.locator('.mdl-value-sound-selectbox')).toHaveCount(0);
        await expect(page.locator('.mdl-shape-overlay-popup .dx-list-item:has-text("Sound")')).toHaveCount(0);
        await expect(page.locator('.mdl-shape-overlay-popup .dx-list-item:has-text("Audio")')).toHaveCount(1);
    });

    test('the sound row offers a file, the catalogue and the pitch-or-volume choice', async ({ page }) => {
        await setupBoard(page, [AUDIO_ENTRY]);
        await addValueShape(page, { term: 'x' });
        await openValueTermsMenu(page);
        const control = page.locator('.mdl-audio-control');
        await expect(control.locator('.mdl-audio-control-input')).toHaveAttribute('accept', 'audio/*');
        await expect(control.locator('.mdl-audio-control-file')).toBeVisible();
        await expect(control.locator('.mdl-audio-control-catalog')).toBeVisible();
        // Nothing to take back, and nothing to name, while nothing has been chosen.
        await expect(control.locator('.mdl-audio-control-clear')).toBeHidden();
        await expect(control.locator('.mdl-audio-control-name')).toBeHidden();
        const modulation = control.locator('.mdl-audio-control-modulation .dx-buttongroup-item');
        await expect(modulation).toHaveCount(2);
        await modulation.nth(1).click();
        await expect.poll(() => page.evaluate(() => shell.board.shapes.getByName('Value1').properties.soundAudioModulation)).toBe('volume');
    });

    // A clip already chosen leaves nothing to choose: the row says which sound it is and offers the
    // bin, and the bin hands the two ways of choosing back.
    test('a chosen clip replaces the two ways of choosing with its name and the bin', async ({ page }) => {
        await setupBoard(page, [AUDIO_ENTRY]);
        await addValueShape(page, { term: 'x', soundAudio: CLIP_URL, soundAudioName: 'tone.mp3' });
        await openValueTermsMenu(page);
        const control = page.locator('.mdl-audio-control');
        await expect(control.locator('.mdl-audio-control-name')).toHaveText('tone.mp3');
        await expect(control.locator('.mdl-audio-control-file')).toBeHidden();
        await expect(control.locator('.mdl-audio-control-catalog')).toBeHidden();
        await control.locator('.mdl-audio-control-clear').click();
        await expect.poll(() => page.evaluate(() => shell.board.shapes.getByName('Value1').properties.soundAudio)).toBe('');
        await expect(control.locator('.mdl-audio-control-file')).toBeVisible();
        await expect(control.locator('.mdl-audio-control-catalog')).toBeVisible();
        await expect(control.locator('.mdl-audio-control-name')).toBeHidden();
        await expect(control.locator('.mdl-audio-control-clear')).toBeHidden();
        // Taking the sound back is one step, so one undo has the clip and its name back together.
        await page.evaluate(() => shell.board.invoker.undo());
        await expect.poll(() => page.evaluate(() => shell.board.shapes.getByName('Value1').properties.soundAudio)).toBe(CLIP_URL);
        expect(await page.evaluate(() => shell.board.shapes.getByName('Value1').properties.soundAudioName)).toBe('tone.mp3');
    });

    test('a catalogue audio picked on a value shape becomes the sound it plays, under the title it was picked by', async ({ page }) => {
        await setupBoard(page, [AUDIO_ENTRY]);
        await addValueShape(page, { term: 'x' });
        await openValueTermsMenu(page);
        await page.locator('.mdl-audio-control-catalog').click();
        await page.waitForSelector('.mdl-catalog-data-card');
        expect(await page.textContent('.mdl-catalog-data-title')).toBe('Tuning fork 440 Hz');
        await page.click('.mdl-catalog-data-card');
        await page.click('.mdl-catalog-data-popup .dx-toolbar-after .dx-button:has-text("Select")');
        await expect.poll(() => page.evaluate(() => shell.board.shapes.getByName('Value1').properties.soundAudio)).toBe(AUDIO_ENTRY.asset_url);
        expect(await page.evaluate(() => shell.board.shapes.getByName('Value1').properties.soundAudioName)).toBe(AUDIO_ENTRY.title);
    });
});

test.describe('an object definition that makes a noise', () => {
    async function addSoundingDial(page, properties = {}) {
        await page.evaluate(({ definition, properties }) => {
            BlockDefinitionLoader.register(definition, BlockRegistry);
            const shape = shell.commands.addComponent('sounding-dial', 'Dial');
            shape.setProperties(Object.assign({ x: 200, y: 120, width: 160, height: 160 }, properties));
            shape.draw();
        }, { definition: SOUNDING_DIAL, properties: properties });
        await page.waitForFunction(() => !!shell.board.shapes.getByName('Dial'));
    }

    test('the clip follows the value the definition points it at, over the scale it names', async ({ page }) => {
        await setupBoard(page);
        // The object is already standing at a value by the time it is asked to make a noise, so the
        // recording starts once it has settled there and the move to seven is the only one in it.
        await addSoundingDial(page, { engineSound: CLIP_URL, valueVariable: '2', minimum: 0, maximum: 10 });
        await recordPlayedSounds(page);
        const sounds = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Dial');
            shape.draw();
            shape.properties.valueVariable = '7';
            shape.draw();
            return window.playedSounds;
        });
        expect(sounds).toEqual([{ url: CLIP_URL, value: 7, modulation: 'pitch', minimum: 0, maximum: 10 }]);
    });

    // The choice of what the value does to the clip belongs to the audio row, so the definition
    // declares nothing for it and the object still starts out with one.
    test('the modulation is kept beside the clip without the definition declaring it', async ({ page }) => {
        await setupBoard(page);
        await addSoundingDial(page, { engineSound: CLIP_URL });
        expect(await page.evaluate(() => shell.board.shapes.getByName('Dial').properties.engineSoundModulation)).toBe('pitch');
    });

    test('an object with no clip chosen makes no noise however its value moves', async ({ page }) => {
        await setupBoard(page);
        await addSoundingDial(page, { valueVariable: '2' });
        await recordPlayedSounds(page);
        const sounds = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Dial');
            shape.draw();
            shape.properties.valueVariable = '7';
            shape.draw();
            return window.playedSounds;
        });
        expect(sounds).toEqual([]);
    });

    // The row is the one every sounding shape gets, so an object with a clip shows the name it was
    // chosen under and the bin, and offers no way of choosing another until the bin is pressed.
    test('an object with a clip shows its name and the bin in place of the choosing', async ({ page }) => {
        await setupBoard(page, [AUDIO_ENTRY]);
        await addSoundingDial(page, { engineSound: CLIP_URL, engineSoundName: 'tone.mp3' });
        await page.evaluate(() => shell.board.selection.select(shell.board.shapes.getByName('Dial')));
        await expect(page.locator('.shape-context-toolbar.visible')).toBeVisible();
        await page.locator('.shape-context-toolbar.visible .mdl-component-settings-selector').click();
        await page.waitForSelector('.mdl-audio-control');
        const control = page.locator('.mdl-audio-control');
        await expect(control.locator('.mdl-audio-control-name')).toHaveText('tone.mp3');
        await expect(control.locator('.mdl-audio-control-file')).toBeHidden();
        await expect(control.locator('.mdl-audio-control-catalog')).toBeHidden();
        await control.locator('.mdl-audio-control-clear').click();
        await expect.poll(() => page.evaluate(() => shell.board.shapes.getByName('Dial').properties.engineSound)).toBe('');
        expect(await page.evaluate(() => shell.board.shapes.getByName('Dial').properties.engineSoundName)).toBe('');
        await expect(control.locator('.mdl-audio-control-file')).toBeVisible();
        await expect(control.locator('.mdl-audio-control-catalog')).toBeVisible();
    });

    test('the sound stands in the object settings menu with both ways of choosing it', async ({ page }) => {
        await setupBoard(page, [AUDIO_ENTRY]);
        await addSoundingDial(page);
        await page.evaluate(() => shell.board.selection.select(shell.board.shapes.getByName('Dial')));
        await expect(page.locator('.shape-context-toolbar.visible')).toBeVisible();
        await page.locator('.shape-context-toolbar.visible .mdl-component-settings-selector').click();
        await page.waitForSelector('.mdl-audio-control');
        const control = page.locator('.mdl-audio-control');
        await expect(control.locator('.mdl-audio-control-file')).toBeVisible();
        await expect(control.locator('.mdl-audio-control-catalog')).toBeVisible();
        await expect(control.locator('.mdl-audio-control-modulation .dx-buttongroup-item')).toHaveCount(2);
        await control.locator('.mdl-audio-control-modulation .dx-buttongroup-item').nth(1).click();
        await expect.poll(() => page.evaluate(() => shell.board.shapes.getByName('Dial').properties.engineSoundModulation)).toBe('volume');
    });
});

// The two objects the editor ships that say they make a noise. The point of them here is not the
// drawing but the wiring: the clip follows the reading, over the very ends the object is marked
// between, without either definition writing a line of code for it.
test.describe('the catalogue objects that make a noise', () => {
    const sounding = [
        { componentType: 'thermometer', name: 'Thermometer', minimum: -20, maximum: 120, standing: '20', moved: '60' },
        { componentType: 'speedometer', name: 'Speedometer', minimum: 0, maximum: 100, standing: '30', moved: '80' }
    ];

    for (const object of sounding) {
        test(`a ${object.componentType} plays its clip over the scale it is marked between`, async ({ page }) => {
            await setupBoard(page);
            await page.evaluate(object => {
                const shape = shell.commands.addComponent(object.componentType, object.name);
                shape.setProperties({ x: 200, y: 80, width: 160, height: 300, valueVariable: object.standing, sound: 'https://audio.test/tone.mp3' });
                shape.draw();
            }, object);
            await page.waitForFunction(name => !!shell.board.shapes.getByName(name), object.name);
            await recordPlayedSounds(page);
            const sounds = await page.evaluate(object => {
                const shape = shell.board.shapes.getByName(object.name);
                shape.draw();
                shape.properties.valueVariable = object.moved;
                shape.draw();
                return window.playedSounds;
            }, object);
            expect(sounds).toEqual([{ url: CLIP_URL, value: Number(object.moved), modulation: 'pitch', minimum: object.minimum, maximum: object.maximum }]);
        });

        test(`the ${object.componentType} settings menu offers the sound`, async ({ page }) => {
            await setupBoard(page, [AUDIO_ENTRY]);
            await page.evaluate(object => {
                const shape = shell.commands.addComponent(object.componentType, object.name);
                shape.setProperties({ x: 200, y: 80, width: 160, height: 300 });
                shape.draw();
            }, object);
            await page.evaluate(name => shell.board.selection.select(shell.board.shapes.getByName(name)), object.name);
            await expect(page.locator('.shape-context-toolbar.visible')).toBeVisible();
            await page.locator('.shape-context-toolbar.visible .mdl-component-settings-selector').click();
            await page.waitForSelector('.mdl-audio-control');
            await expect(page.locator('.mdl-audio-control-file')).toBeVisible();
            await expect(page.locator('.mdl-audio-control-catalog')).toBeVisible();
            await expect(page.locator('.mdl-audio-control-modulation .dx-buttongroup-item')).toHaveCount(2);
            await page.locator('.mdl-audio-control-modulation .dx-buttongroup-item').nth(1).click();
            await expect.poll(() => page.evaluate(name => shell.board.shapes.getByName(name).properties.soundModulation, object.name)).toBe('volume');
        });
    }
});
