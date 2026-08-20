const { test, expect } = require('@playwright/test');

const MathColorScheme = require('../scripts/controls/mathColorScheme.js');

const TOKENS = ['#183b66', '#c65d00', '#626b75', '#2e7d4f', '#b0185b', '#347dac', '#7047b8', '#d32f2f', '#ad6800'];
const BACKGROUNDS = ['#ffffff', '#000000', '#1e1f22', '#f5f5f5', '#101418', '#ffe9a8', '#3b6ea5', '#808080', '#2e7d4f'];

function contrast(firstColor, secondColor) {
    return MathColorScheme.contrastRatio(MathColorScheme.parse(firstColor), MathColorScheme.parse(secondColor));
}

function hueOf(color) {
    return MathColorScheme.toOklch(MathColorScheme.parse(color)).hue;
}

function hueDistance(firstColor, secondColor) {
    const difference = Math.abs(hueOf(firstColor) - hueOf(secondColor)) % (Math.PI * 2);
    return Math.min(difference, Math.PI * 2 - difference);
}

test.describe('colour parsing', () => {
    test('hexadecimal, short hexadecimal and alpha hexadecimal are read', () => {
        expect(MathColorScheme.parse('#ffffff')).toEqual({ red: 1, green: 1, blue: 1, alpha: 1 });
        expect(MathColorScheme.parse('#000')).toEqual({ red: 0, green: 0, blue: 0, alpha: 1 });
        expect(MathColorScheme.parse('#00000080').alpha).toBeCloseTo(0.5, 2);
    });

    test('functional and named colours are read', () => {
        expect(MathColorScheme.parse('rgb(255, 0, 0)')).toEqual({ red: 1, green: 0, blue: 0, alpha: 1 });
        expect(MathColorScheme.parse('rgba(0, 0, 0, 0.25)').alpha).toBeCloseTo(0.25, 2);
        expect(MathColorScheme.parse('rgb(0 0 0 / 50%)').alpha).toBeCloseTo(0.5, 2);
        expect(MathColorScheme.format(MathColorScheme.parse('white'))).toBe('#ffffff');
    });

    test('a colour that carries no paint is reported as such', () => {
        expect(MathColorScheme.parse('transparent')).toEqual({ red: 0, green: 0, blue: 0, alpha: 0 });
        expect(MathColorScheme.parse('')).toBe(null);
        expect(MathColorScheme.parse('currentcolor')).toBe(null);
    });

    test('translucent layers are flattened onto what is behind them', () => {
        const layers = [MathColorScheme.parse('rgba(0, 0, 0, 0.5)')];
        expect(MathColorScheme.format(MathColorScheme.flatten(layers))).toBe('#808080');
        expect(MathColorScheme.format(MathColorScheme.flatten([MathColorScheme.parse('rgba(255, 255, 255, 0.5)')], MathColorScheme.black))).toBe('#808080');
        expect(MathColorScheme.format(MathColorScheme.flatten([]))).toBe('#ffffff');
    });
});

test.describe('contrast measurement', () => {
    test('the extremes of the scale are known', () => {
        expect(contrast('#ffffff', '#000000')).toBeCloseTo(21, 1);
        expect(contrast('#808080', '#808080')).toBeCloseTo(1, 5);
    });

    test('a light and a dark background are told apart', () => {
        expect(MathColorScheme.isLight(MathColorScheme.parse('#ffffff'))).toBe(true);
        expect(MathColorScheme.isLight(MathColorScheme.parse('#1e1f22'))).toBe(false);
    });
});

test.describe('adapting a colour to a background', () => {
    test('every token reaches its target over a white and over a black card', () => {
        TOKENS.forEach(token => {
            expect(contrast(MathColorScheme.adapt(token, '#ffffff', 6), '#ffffff')).toBeGreaterThanOrEqual(6);
            expect(contrast(MathColorScheme.adapt(token, '#000000', 6), '#000000')).toBeGreaterThanOrEqual(6);
        });
    });

    test('every token stays readable over any card colour', () => {
        BACKGROUNDS.forEach(background => {
            TOKENS.forEach(token => {
                expect(contrast(MathColorScheme.adapt(token, background, 6), background)).toBeGreaterThanOrEqual(4.4);
            });
        });
    });

    test('a colour that already contrasts enough keeps its lightness', () => {
        const adapted = MathColorScheme.adapt('#183b66', '#ffffff', 6);
        expect(contrast(adapted, '#ffffff')).toBeGreaterThan(10);
        expect(MathColorScheme.toOklch(MathColorScheme.parse(adapted)).lightness).toBeCloseTo(MathColorScheme.toOklch(MathColorScheme.parse('#183b66')).lightness, 2);
    });

    test('a pale colour is darkened over a light card and a deep one is lightened over a dark card', () => {
        const paleOverLight = MathColorScheme.adapt('#a9c8ee', '#ffffff', 6);
        const deepOverDark = MathColorScheme.adapt('#183b66', '#101418', 6);
        expect(MathColorScheme.toOklch(MathColorScheme.parse(paleOverLight)).lightness).toBeLessThan(MathColorScheme.toOklch(MathColorScheme.parse('#a9c8ee')).lightness);
        expect(MathColorScheme.toOklch(MathColorScheme.parse(deepOverDark)).lightness).toBeGreaterThan(MathColorScheme.toOklch(MathColorScheme.parse('#183b66')).lightness);
    });

    test('the hue of the token survives the adjustment', () => {
        TOKENS.filter(token => token !== '#626b75').forEach(token => {
            expect(hueDistance(MathColorScheme.adapt(token, '#ffffff', 6), token)).toBeLessThan(0.12);
            expect(hueDistance(MathColorScheme.adapt(token, '#101418', 6), token)).toBeLessThan(0.12);
        });
    });

    test('a colour comes back stronger than the token it started from', () => {
        const chromaOf = color => MathColorScheme.toOklch(MathColorScheme.parse(color)).chroma;
        expect(chromaOf(MathColorScheme.adapt('#2e7d4f', '#ffffff', 6))).toBeGreaterThan(chromaOf('#2e7d4f'));
        expect(chromaOf(MathColorScheme.adapt('#347dac', '#101418', 6))).toBeGreaterThan(chromaOf('#347dac'));
    });

    test('a grey token stays grey', () => {
        const adapted = MathColorScheme.adapt('#626b75', '#101418', 4.5);
        expect(MathColorScheme.toOklch(MathColorScheme.parse(adapted)).chroma).toBeLessThan(0.03);
    });

    test('the operator colour stays quieter than the variable colour', () => {
        expect(contrast(MathColorScheme.adapt('#626b75', '#101418', 4.5), '#101418')).toBeLessThan(contrast(MathColorScheme.adapt('#183b66', '#101418', 6), '#101418'));
    });

    test('a target nobody can reach falls back to the best readable colour', () => {
        const adapted = MathColorScheme.adapt('#c65d00', '#808080', 6);
        expect(contrast(adapted, '#808080')).toBeGreaterThanOrEqual(4.4);
        expect(contrast(adapted, '#808080')).toBeLessThan(6);
    });

    test('a colour that cannot be parsed is handed back untouched', () => {
        expect(MathColorScheme.adapt('inherit', '#ffffff', 6)).toBe('inherit');
    });

    test('a missing background is treated as white', () => {
        expect(MathColorScheme.adapt('#a9c8ee', 'transparent', 6)).toBe(MathColorScheme.adapt('#a9c8ee', '#ffffff', 6));
    });
});
