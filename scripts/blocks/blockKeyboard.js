// The musical keyboard, as a piano has always laid it out: twelve semitones to the octave, seven of
// them white and the other five riding over the seams between them. Everything is worked out from
// the note number, so a keyboard starting anywhere is drawn, named and tuned by the same rules —
// the same service BlockGeometry does for anything drawn around a centre.
class BlockKeyboard {
    static noteNames = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
    static blackSemitones = [1, 3, 6, 8, 10];
    static referenceFrequency = 440;
    static referenceNoteNumber = 69;
    static lowestOctave = 0;
    static highestOctave = 8;
    static minimumOctaves = 1;
    static maximumOctaves = 4;
    static blackKeyWidthRatio = 0.62;
    static blackKeyHeightRatio = 0.62;
    // The two rows a tracker keyboard has used since before there were tracker keyboards: the lower
    // row is one octave and the upper row the octave above it, with the sharps on the row of keys
    // physically above the naturals, exactly where they sit on the piano. They are read as physical
    // keys rather than as letters, so the mapping holds its shape on a keyboard of any layout.
    static computerKeyCodes = [
        "KeyZ", "KeyS", "KeyX", "KeyD", "KeyC", "KeyV", "KeyG", "KeyB", "KeyH", "KeyN", "KeyJ", "KeyM",
        "KeyQ", "Digit2", "KeyW", "Digit3", "KeyE", "KeyR", "Digit5", "KeyT", "Digit6", "KeyY", "Digit7", "KeyU"
    ];

    static getNoteNumber(octave, semitoneOffset) {
        return (octave + 1) * 12 + semitoneOffset;
    }

    static getSemitone(noteNumber) {
        return ((noteNumber % 12) + 12) % 12;
    }

    // Equal temperament measured from the A above middle C, the pitch every other note on the
    // keyboard is a whole number of semitones away from.
    static getFrequency(noteNumber) {
        return BlockKeyboard.referenceFrequency * Math.pow(2, (noteNumber - BlockKeyboard.referenceNoteNumber) / 12);
    }

    static isBlackKey(noteNumber) {
        return BlockKeyboard.blackSemitones.includes(BlockKeyboard.getSemitone(noteNumber));
    }

    static getNoteName(noteNumber) {
        return `${BlockKeyboard.noteNames[BlockKeyboard.getSemitone(noteNumber)]}${Math.floor(noteNumber / 12) - 1}`;
    }

    static getComputerKeyCode(semitoneOffset) {
        return BlockKeyboard.computerKeyCodes[semitoneOffset] ?? "";
    }

    static getComputerKeyOffset(code) {
        return BlockKeyboard.computerKeyCodes.indexOf(code);
    }

    static clampOctaves(value) {
        const octaves = Math.round(Number(value));
        if (!Number.isFinite(octaves))
            return 2;
        return Math.max(BlockKeyboard.minimumOctaves, Math.min(BlockKeyboard.maximumOctaves, octaves));
    }

    static clampFirstOctave(value) {
        const octave = Math.round(Number(value));
        if (!Number.isFinite(octave))
            return 4;
        return Math.max(BlockKeyboard.lowestOctave, Math.min(BlockKeyboard.highestOctave, octave));
    }

    // The white keys carry the whole width between them and the black ones are laid over the seams,
    // which is why a black key's place is read from the white key that follows it rather than from
    // its own place in the run of semitones. The keyboard ends on the C that closes the last octave,
    // the way a real one ends on a natural.
    static buildKeys(firstOctave, octaves, width, height) {
        const octaveCount = BlockKeyboard.clampOctaves(octaves);
        const startOctave = BlockKeyboard.clampFirstOctave(firstOctave);
        const whiteKeyCount = octaveCount * 7 + 1;
        const whiteKeyWidth = Math.max(0, width) / whiteKeyCount;
        const blackKeyWidth = whiteKeyWidth * BlockKeyboard.blackKeyWidthRatio;
        const blackKeyHeight = Math.max(0, height) * BlockKeyboard.blackKeyHeightRatio;
        const keys = [];
        let whiteIndex = 0;
        for (let semitoneOffset = 0; semitoneOffset <= octaveCount * 12; semitoneOffset++) {
            const noteNumber = BlockKeyboard.getNoteNumber(startOctave, semitoneOffset);
            const black = BlockKeyboard.isBlackKey(noteNumber);
            keys.push({
                semitoneOffset: semitoneOffset,
                noteNumber: noteNumber,
                black: black,
                name: BlockKeyboard.getNoteName(noteNumber),
                frequency: BlockKeyboard.getFrequency(noteNumber),
                computerKeyCode: BlockKeyboard.getComputerKeyCode(semitoneOffset),
                x: black ? whiteIndex * whiteKeyWidth - blackKeyWidth / 2 : whiteIndex * whiteKeyWidth,
                y: 0,
                width: black ? blackKeyWidth : whiteKeyWidth,
                height: black ? blackKeyHeight : Math.max(0, height)
            });
            if (!black)
                whiteIndex++;
        }
        return keys;
    }
}

if (typeof module !== "undefined" && module.exports)
    module.exports = BlockKeyboard;
