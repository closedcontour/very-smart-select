import { SelectionStrategy, Range } from "../api";
import { TextEditor } from "vscode";
import {
    createSourceFile,
    Node,
    ScriptTarget,
    SyntaxKind,
    isTemplateSpan,
    isBlock,
    isObjectLiteralExpression,
    isObjectBindingPattern
} from "typescript";

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
        end: range.end - rightRemove
    };
}

export function nodeToRange(node: Node): Range | undefined {
    let ds = 0;
    let de = 0;
    if (node.kind === SyntaxKind.TemplateHead) {
        ds = 2;
        de = -2;
    }
    if (node.kind === SyntaxKind.TemplateTail) {
        ds = 1;
        de = -1;
    }
    if (node.kind === SyntaxKind.TemplateMiddle) {
        ds = 1;
        de = -2;
    }
    if (isTemplateSpan(node)) {
        ds = -2;
        de = -node.literal.getFullWidth() + 1;
    }
    return {
        start: node.getFullStart() + ds,
        end: node.getEnd() + de
    };
}

export class TypescriptStrategy implements SelectionStrategy {
    grow(editor: TextEditor, excludeBrackets: boolean): Range[] {
        const doc = editor.document;
        const startRanges = editor.selections.map(selection => ({
            start: doc.offsetAt(selection.start),
            end: doc.offsetAt(selection.end)
        }));
        const text = doc.getText();
        const node = createSourceFile(doc.fileName, text, ScriptTarget.Latest);
        const outRanges = startRanges
            .map(range => {
                const path = pathToPosition(node, range.start, range.end);
                let expansionNode: Node | undefined;
                let expansionRange: Range | undefined;
                for (let i = path.length - 1; i >= 0; i--) {
                    const candidate = path[i];
                    const candidateRange = nodeToRange(candidate);
                    if (candidateRange === undefined) {
                        continue;
                    }
                    const outRange = collapseWhitespace(text, candidateRange);
                    if (
                        (outRange.start < range.start && outRange.end >= range.end) ||
                        (outRange.end > range.end && outRange.start <= range.start)
                    ) {
                        expansionNode = candidate;
                        expansionRange = candidateRange;
                        break;
                    }
                }
                if (expansionNode === undefined || expansionRange === undefined) {
                    return undefined;
                }
                const outRange = collapseWhitespace(text, expansionRange);
                if (excludeBrackets) {
                    const expansionNodeSelected: Node = expansionNode;
                    const nodeTypesWithBrackets = [isBlock, isObjectLiteralExpression, isObjectBindingPattern];
                    if (nodeTypesWithBrackets.some(isType => isType(expansionNodeSelected))) {
                        const alreadyInBrackets =
                            outRange.start + 1 === range.start && outRange.end - 1 === range.end;
                        // if we are already inside the bracket selection then expand to include them
                        if (!alreadyInBrackets) {
                            outRange.start++;
                            outRange.end--;
                        }
                    }
                }
                return outRange;
            })
            .filter(range => range !== undefined)
            .map(range => range!);
        return outRanges;
    }
}
