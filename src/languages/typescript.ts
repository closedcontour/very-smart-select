import { SelectionStrategy, Range } from "../api";
import { TextEditor } from "vscode";
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
function expandWhitespace(source: string, range: Range): Range {
    let i = range.start - 1;
    let leftAdd = 0;
    while (i >= 0 && WHITESPACE.test(source.charAt(i))) {
        i--;
        leftAdd++;
    }
    let j = range.end + 1;
    let rightAdd = 0;
    while (j < source.length && WHITESPACE.test(source.charAt(j))) {
        j++;
        rightAdd++;
    }
    return {
        start: range.start - leftAdd,
        end: range.end + rightAdd,
    };
}

function collapseWhitespace(source: string, range: Range): Range {
    let i = range.start;
    let leftRemove = 0;
    while (i < source.length && WHITESPACE.test(source.charAt(i))) {
        i++;
        leftRemove++;
    }
    let j = range.end - 1;
    let rightRemove = 0;
    while (j >= 0 && WHITESPACE.test(source.charAt(j))) {
        j--;
        rightRemove++;
    }
    return {
        start: range.start + leftRemove,
        end: range.end - rightRemove,
    };
}

function compact<T>(items: (T | undefined)[]): T[] {
    const compactedItems: T[] = [];
    for (const item of items) {
        if (item !== undefined) {
            compactedItems.push(item);
        }
    }
    return compactedItems;
}

export function nodeToRange(node: Node): Range {
    return {
        start: node.getFullStart(),
        end: node.getEnd(),
    };
}

export class TypescriptStrategy implements SelectionStrategy {
    private expandWhitespace = false;

    grow(editor: TextEditor): Range[] {
        const doc = editor.document;
        const startRanges = editor.selections.map(selection => ({
            start: doc.offsetAt(selection.start),
            end: doc.offsetAt(selection.end),
        }));
        const text = doc.getText();
        const ranges = this.expandWhitespace 
            ? startRanges.map(range => expandWhitespace(text, range)) 
            : startRanges;
        const node = createSourceFile(doc.fileName, text, ScriptTarget.Latest);
        const outRanges = compact(ranges.map(range => {
            const path = pathToPosition(node, range.start, range.end);
            let expansionNode: Node | undefined;
            for (let i = path.length - 1; i >= 0; i--) {
                const candidate = path[i];
                const outRange = collapseWhitespace(text, nodeToRange(candidate));
                if (outRange.start < range.start || outRange.end > range.end) {
                    expansionNode = candidate;
                    break;
                }
            }
            if (expansionNode === undefined) {
                return undefined;
            }
            const outRange = collapseWhitespace(text, nodeToRange(expansionNode));
            return outRange;
        }));
        
        return outRanges;
    }
}