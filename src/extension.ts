import { window, ExtensionContext, commands, Selection, Disposable }  from 'vscode';
import { SelectionStrategy, Range } from './api';
import { TypescriptStrategy } from './languages/typescript';

export function activate(context: ExtensionContext) {
    const verySmartSelect = new VerySmartSelect();
    const growCommand = commands.registerCommand('very-smart-select.grow', () => {
        verySmartSelect.grow();
    });
    const shrinkCommand = commands.registerCommand('very-smart-select.shrink', () => {
        verySmartSelect.shrink();
    });

    context.subscriptions.push(growCommand);
    context.subscriptions.push(shrinkCommand);
    context.subscriptions.push(verySmartSelect);
}

export function deactivate() {
}

class VerySmartSelect {
    private strategies: { [key:string]: SelectionStrategy | undefined } = {};

    private selectionHistory: Range[] = [];
    private windowSelectionListener: Disposable;
    private lastRange: Range | undefined;

    constructor() {
        this.strategies["typescript"] = new TypescriptStrategy();
        this.strategies["typescriptreact"] = new TypescriptStrategy();
        this.strategies["javascript"] = new TypescriptStrategy();
        this.strategies["javascriptreact"] = new TypescriptStrategy();
        this.strategies["json"] = new TypescriptStrategy();

        this.windowSelectionListener = window.onDidChangeTextEditorSelection(e => {
            const newSelection = e.selections[0];
            if (this.lastRange === undefined
                || this.lastRange.start !== e.textEditor.document.offsetAt(newSelection.start)
                || this.lastRange.end !== e.textEditor.document.offsetAt(newSelection.end)) {
                this.lastRange = undefined;
                this.selectionHistory = [];
            }
        });
    }

    public grow() {
        const editor = window.activeTextEditor;
        if (!editor) {
            return undefined;
        }
        const doc = editor.document;
        const strategy = this.strategies[doc.languageId];
        if (strategy === undefined) {
            return;
        }
        const range = strategy.grow(window.activeTextEditor!);
        if (range === undefined) {
            return;
        }
        this.selectionHistory.push({
            start: doc.offsetAt(editor.selection.start),
            end: doc.offsetAt(editor.selection.end),
        });
        this.adjustSelection(range);
    }

    public shrink() {
        const historyItem = this.selectionHistory.pop();
        if (historyItem) {
            this.adjustSelection(historyItem);
        }
    }

    public dispose() {
        this.windowSelectionListener.dispose();
    }

    private adjustSelection(range: Range) {
        const editor = window.activeTextEditor;
        if (editor === undefined) {
            return;
        }
        const doc = editor.document;
        this.lastRange = range;
        editor.selection = new Selection(doc.positionAt(range.start), doc.positionAt(range.end));
    }
}
