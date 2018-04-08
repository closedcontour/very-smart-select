import { SelectionStrategy, Range } from "../api";
import { TextEditor, Selection } from "vscode";
import { createSourceFile, Node, ScriptTarget } from "typescript";

function pathToPositionInternal(node: Node, start: number, end: number, path: Node[]) {
    const nodeStart = node.getFullStart();
    const nodeEnd = node.getEnd();
    if (start < nodeStart || end > nodeEnd) {
        return;
    }
    path.push(node);
    node.forEachChild(child => {
        pathToPositionInternal(child, start, end, path);
    });
}

function pathToPosition(node: Node, start: number, end: number): Node[] {
    const path: Node[] = [];
    pathToPositionInternal(node, start, end, path);
    return path;
}

const WHITESPACE = /\s/;

// TODO: if you start in whitespace on either side, expand until you include non-whitespace
function expandWhitespace(source: string, start: number, end: number): Range {
    let i = start - 1;
    let leftAdd = 0;
    while (i >= 0 && WHITESPACE.test(source.charAt(i))) {
        i--;
        leftAdd++;
    }
    let j = end + 1;
    let rightAdd = 0;
    while (j < source.length && WHITESPACE.test(source.charAt(j))) {
        j++;
        rightAdd++;
    }
    return {
        start: start - leftAdd,
        end: end + rightAdd,
    };
}

function collapseWhitespace(source: string, start: number, end: number): Range {
    let i = start;
    let leftRemove = 0;
    while (i < source.length && WHITESPACE.test(source.charAt(i))) {
        i++;
        leftRemove++;
    }
    let j = end - 1;
    let rightRemove = 0;
    while (j >= 0 && WHITESPACE.test(source.charAt(j))) {
        j--;
        rightRemove++;
    }
    return {
        start: start + leftRemove,
        end: end - rightRemove,
    };
}

export class TypescriptStrategy implements SelectionStrategy {
    grow(editor: TextEditor): void {
        const doc = editor.document;
        const selectionStart = doc.offsetAt(editor.selection.start);
        const selectionEnd = doc.offsetAt(editor.selection.end);
        const text = doc.getText();
        const range = expandWhitespace(text, selectionStart, selectionEnd);
        const node = createSourceFile(doc.fileName, text, ScriptTarget.Latest);
        const path = pathToPosition(node, range.start, range.end);
        let expansionNode: Node | undefined;
        for (let i = path.length - 1; i >= 0; i--) {
            const candidate = path[i];
            const outRange = collapseWhitespace(text, candidate.getFullStart(), candidate.getEnd());
            if (outRange.start < range.start || outRange.end > range.end) {
                expansionNode = candidate;
                break;
            }
        }
        if (expansionNode === undefined) {
            return;
        }
        const outRange = collapseWhitespace(text, expansionNode.getFullStart(), expansionNode.getEnd());
        editor.selection = new Selection(doc.positionAt(outRange.start), doc.positionAt(outRange.end));
    }

    shrink(editor: TextEditor): void {
        // TODO: need use history from above
    }
}