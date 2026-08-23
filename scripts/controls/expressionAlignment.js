class ExpressionAlignment {
    static displaylinesPrefix = "\\displaylines{";
    static alignEnvironmentNames = ["align", "align*", "aligned"];

    static toCanonical(latex) {
        const rows = ExpressionAlignment.readRows(latex);
        const rowsLatex = rows.map(row => row.cells.map(cell => cell.trim()).join("")).join("\\\\");
        return `${ExpressionAlignment.displaylinesPrefix}${rowsLatex}}`;
    }

    static toPresentation(latex) {
        const canonical = ExpressionAlignment.toCanonical(latex);
        const rows = ExpressionAlignment.readRows(canonical);
        if (!ExpressionAlignment.shouldAlign(rows, ExpressionAlignment.isAligned(latex)))
            return canonical;
        const alignedRows = rows.map(row => ExpressionAlignment.buildAlignedRow(row.cells.join("")));
        return `\\begin{align}${alignedRows.join("\\\\")}\\end{align}`;
    }

    static shouldAlign(rows, isCurrentlyAligned = false) {
        if (rows.length < 2)
            return false;
        let equationRowsCount = 0;
        for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
            const rowLatex = rows[rowIndex].cells.join("");
            if (ExpressionAlignment.findPrimaryRelationIndex(rowLatex) >= 0)
                equationRowsCount++;
        }
        if (isCurrentlyAligned)
            return equationRowsCount >= 1;
        return equationRowsCount >= 2;
    }

    static buildAlignedRow(rowLatex) {
        const relationIndex = ExpressionAlignment.findPrimaryRelationIndex(rowLatex);
        if (relationIndex < 0)
            return rowLatex;
        return `${rowLatex.substring(0, relationIndex)}&${rowLatex.substring(relationIndex)}`;
    }

    static keepsContent(presentedLatex, canonicalLatex) {
        return ExpressionAlignment.readContent(presentedLatex) === ExpressionAlignment.readContent(canonicalLatex);
    }

    static readContent(latex) {
        return ExpressionAlignment.toCanonical(latex).replace(/[\s&]/g, "");
    }

    static isAligned(latex) {
        const normalizedLatex = String(latex ?? "").trim();
        for (let nameIndex = 0; nameIndex < ExpressionAlignment.alignEnvironmentNames.length; nameIndex++) {
            if (normalizedLatex.startsWith(`\\begin{${ExpressionAlignment.alignEnvironmentNames[nameIndex]}}`))
                return true;
        }
        return false;
    }

    static readRows(latex) {
        const normalizedLatex = ExpressionAlignment.unwrap(String(latex ?? ""));
        const rowsLatex = ExpressionAlignment.splitTopLevel(normalizedLatex, "row");
        return rowsLatex.map(rowLatex => ({ cells: ExpressionAlignment.splitTopLevel(rowLatex, "cell") }));
    }

    static unwrap(latex) {
        const trimmedLatex = latex.trim();
        if (ExpressionAlignment.isAligned(trimmedLatex)) {
            const bodyStart = trimmedLatex.indexOf("}") + 1;
            const bodyEnd = trimmedLatex.lastIndexOf("\\end{");
            return trimmedLatex.substring(bodyStart, bodyEnd < 0 ? trimmedLatex.length : bodyEnd);
        }
        if (!trimmedLatex.startsWith(ExpressionAlignment.displaylinesPrefix))
            return trimmedLatex;
        const closingIndex = ExpressionAlignment.findMatchingBraceIndex(trimmedLatex, ExpressionAlignment.displaylinesPrefix.length - 1);
        if (closingIndex < 0)
            return trimmedLatex.substring(ExpressionAlignment.displaylinesPrefix.length);
        const insideLatex = trimmedLatex.substring(ExpressionAlignment.displaylinesPrefix.length, closingIndex);
        const trailingLatex = trimmedLatex.substring(closingIndex + 1);
        return ExpressionAlignment.unwrap(insideLatex) + trailingLatex;
    }

    static findMatchingBraceIndex(latex, openBraceIndex) {
        let depth = 0;
        for (let characterIndex = openBraceIndex; characterIndex < latex.length; characterIndex++) {
            const character = latex[characterIndex];
            if (character === "\\") {
                characterIndex++;
                continue;
            }
            if (character === "{")
                depth++;
            else if (character === "}") {
                depth--;
                if (depth === 0)
                    return characterIndex;
            }
        }
        return -1;
    }

    static splitTopLevel(latex, separatorKind) {
        const parts = [];
        let currentPart = "";
        let braceDepth = 0;
        let environmentDepth = 0;
        let characterIndex = 0;
        while (characterIndex < latex.length) {
            const character = latex[characterIndex];
            if (character === "\\") {
                if (latex.startsWith("\\\\", characterIndex)) {
                    if (separatorKind === "row" && braceDepth === 0 && environmentDepth === 0) {
                        parts.push(currentPart);
                        currentPart = "";
                        characterIndex += 2;
                        continue;
                    }
                    currentPart += "\\\\";
                    characterIndex += 2;
                    continue;
                }
                const commandMatch = /^\\([a-zA-Z]+)/.exec(latex.substring(characterIndex));
                if (commandMatch) {
                    if (commandMatch[1] === "begin")
                        environmentDepth++;
                    else if (commandMatch[1] === "end")
                        environmentDepth--;
                    currentPart += commandMatch[0];
                    characterIndex += commandMatch[0].length;
                    continue;
                }
                currentPart += latex.substring(characterIndex, characterIndex + 2);
                characterIndex += 2;
                continue;
            }
            if (character === "&" && separatorKind === "cell" && braceDepth === 0 && environmentDepth === 0) {
                parts.push(currentPart);
                currentPart = "";
                characterIndex++;
                continue;
            }
            if (character === "{")
                braceDepth++;
            else if (character === "}")
                braceDepth--;
            currentPart += character;
            characterIndex++;
        }
        parts.push(currentPart);
        return parts;
    }

    static findPrimaryRelationIndex(rowLatex) {
        let braceDepth = 0;
        let environmentDepth = 0;
        let delimiterDepth = 0;
        let characterIndex = 0;
        while (characterIndex < rowLatex.length) {
            const character = rowLatex[characterIndex];
            if (character === "\\") {
                const commandMatch = /^\\([a-zA-Z]+)/.exec(rowLatex.substring(characterIndex));
                if (commandMatch) {
                    if (commandMatch[1] === "begin")
                        environmentDepth++;
                    else if (commandMatch[1] === "end")
                        environmentDepth--;
                    else if (commandMatch[1] === "left")
                        delimiterDepth++;
                    else if (commandMatch[1] === "right")
                        delimiterDepth--;
                    else if (commandMatch[1] === "in" && braceDepth === 0 && environmentDepth === 0 && delimiterDepth === 0)
                        return characterIndex;
                    characterIndex += commandMatch[0].length;
                    continue;
                }
                characterIndex += 2;
                continue;
            }
            if (character === "{")
                braceDepth++;
            else if (character === "}")
                braceDepth--;
            else if (character === "=" && braceDepth === 0 && environmentDepth === 0 && delimiterDepth === 0)
                return characterIndex;
            characterIndex++;
        }
        return -1;
    }

    static getExpectedCells(rowLatex) {
        const relationIndex = ExpressionAlignment.findPrimaryRelationIndex(rowLatex);
        if (relationIndex < 0)
            return [rowLatex];
        return [rowLatex.substring(0, relationIndex), rowLatex.substring(relationIndex)];
    }

    static needsNormalization(latex) {
        const rows = ExpressionAlignment.readRows(latex);
        const isCurrentlyAligned = ExpressionAlignment.isAligned(latex);
        const shouldBeAligned = ExpressionAlignment.shouldAlign(rows, isCurrentlyAligned);
        if (shouldBeAligned !== isCurrentlyAligned)
            return true;
        if (!shouldBeAligned)
            return false;
        for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
            const cells = rows[rowIndex].cells.map(cell => cell.trim());
            const rowLatex = cells.join("");
            if (rowLatex === "")
                continue;
            const expectedCells = ExpressionAlignment.getExpectedCells(rowLatex);
            const cellsCount = Math.max(cells.length, expectedCells.length);
            for (let cellIndex = 0; cellIndex < cellsCount; cellIndex++) {
                const actualCell = cells[cellIndex] ?? "";
                const expectedCell = expectedCells[cellIndex] ?? "";
                if (actualCell !== expectedCell)
                    return true;
            }
        }
        return false;
    }
}

if (typeof module !== "undefined" && module.exports)
    module.exports = ExpressionAlignment;
