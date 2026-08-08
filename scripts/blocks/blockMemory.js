// A memory is an ordered list of rows an object writes as it is used and reads back when it draws.
// It lives in a component parameter like every other value, so the model carries it, undo restores
// it and collaboration sends it without any of them knowing what a memory is.
class BlockMemory {
    static maxRows = 2000;
    static fields = ["text", "x", "y"];

    static read(parameters, memoryName) {
        const rows = (parameters ?? {})[memoryName];
        return Array.isArray(rows) ? rows : [];
    }

    static count(rows) {
        return Array.isArray(rows) ? rows.length : 0;
    }

    // Rows are numbered from the oldest by default; "end" numbers them from the newest, which is
    // the order a history list reads in and the order a playhead runs backwards through.
    static resolvePosition(rows, index, from) {
        const count = BlockMemory.count(rows);
        const requested = Math.floor(Number(index));
        if (!Number.isFinite(requested))
            return -1;
        const position = from === "end" ? count - 1 - requested : requested;
        if (position < 0 || position >= count)
            return -1;
        return position;
    }

    static getRow(rows, index, from) {
        const position = BlockMemory.resolvePosition(rows, index, from);
        return position < 0 ? null : rows[position];
    }

    static getField(rows, index, from, field) {
        const row = BlockMemory.getRow(rows, index, from);
        if (!row)
            return null;
        return BlockMemory.readField(row, field);
    }

    static readField(row, field) {
        if (field === "text")
            return String(row.text ?? "");
        const value = Number(row[field]);
        return Number.isFinite(value) ? value : 0;
    }

    // A row carries a label and a point: the label is what a history list reads, the point is what a
    // trace draws. Only what a row actually holds is written — a missing field reads as empty or as
    // zero, which is what it would have been written as — so a long recording stays small and a
    // history row reads as the operation it is.
    static createRow(text, x, y) {
        const row = {};
        const label = String(text ?? "");
        if (label !== "")
            row.text = label;
        const horizontal = BlockMemory.roundValue(x);
        const vertical = BlockMemory.roundValue(y);
        if (horizontal !== 0)
            row.x = horizontal;
        if (vertical !== 0)
            row.y = vertical;
        return row;
    }

    static roundValue(value) {
        const numeric = Number(value);
        if (!Number.isFinite(numeric))
            return 0;
        return Math.round(numeric * 1e6) / 1e6;
    }

    static getLimit(limit) {
        const requested = Math.floor(Number(limit));
        if (!Number.isFinite(requested) || requested < 1)
            return BlockMemory.maxRows;
        return Math.min(requested, BlockMemory.maxRows);
    }

    // Appending returns a new list rather than growing the one the shape holds, so a memory reaches
    // the property setter as a value: the change is seen, recorded and sent like any other.
    static append(rows, row, limit) {
        const kept = BlockMemory.count(rows) === 0 ? [row] : rows.concat([row]);
        const cap = BlockMemory.getLimit(limit);
        return kept.length > cap ? kept.slice(kept.length - cap) : kept;
    }

    // A memory whose fields name model terms is a set of measurements: one column per named field,
    // one row per iteration. It reaches the model through the same door a data table's columns do.
    static toTermSeries(rows, fieldTerms) {
        const names = [];
        const fields = [];
        for (const [field, termName] of Object.entries(fieldTerms ?? {})) {
            const name = String(termName ?? "");
            if (name === "" || names.includes(name))
                continue;
            names.push(name);
            fields.push(field);
        }
        if (names.length === 0)
            return { names: [], values: [] };
        return {
            names: names,
            values: (Array.isArray(rows) ? rows : []).map(row => fields.map(field => BlockMemory.readField(row, field)))
        };
    }

    static toPoints(rows) {
        return (Array.isArray(rows) ? rows : []).map(row => ({
            x: BlockMemory.readField(row, "x"),
            y: BlockMemory.readField(row, "y")
        }));
    }
}

if (typeof module !== "undefined" && module.exports)
    module.exports = BlockMemory;
