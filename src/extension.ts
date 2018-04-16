import { window, ExtensionContext, commands, Selection, Disposable }  from 'vscode';
import { SelectionStrategy } from './api';
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

function areSelectionsEqual(selections: Selection[], otherSelections: Selection[]): boolean {
    return selections.length === otherSelections.length
        && selections.every((selection, index) => selection.isEqual(otherSelections[index]));
}

class VerySmartSelect {
    private strategies: { [key:string]: SelectionStrategy | undefined } = {};

    private selectionsHistory: Selection[][] = [];
    private windowSelectionListener: Disposable;
    private didUpdateSelections: boolean = false;

    constructor() {
        this.strategies["typescript"] = new TypescriptStrategy();
        this.strategies["typescriptreact"] = new TypescriptStrategy();
        this.strategies["javascript"] = new TypescriptStrategy();
        this.strategies["javascriptreact"] = new TypescriptStrategy();
        this.strategies["json"] = new TypescriptStrategy();
        this.strategies["jsonc"] = new TypescriptStrategy();

        this.windowSelectionListener = window.onDidChangeTextEditorSelection(e => {
            if (this.didUpdateSelections) {
                this.didUpdateSelections = false;
            } else {
                this.selectionsHistory = [];
            }
        });
    }

    public grow() {
        const editor = window.activeTextEditor;
        if (!editor) {
            return;
        }
        const doc = editor.document;
        const strategy = this.strategies[doc.languageId];
        if (strategy === undefined) {
            commands.executeCommand("editor.action.smartSelect.grow");
            return;
        }
        const ranges = strategy.grow(editor);
        const selections = ranges.map(range =>
            new Selection(doc.positionAt(range.start), doc.positionAt(range.end))
        );
        this.updateSelectionsHistory(editor.selections);
        this.updateSelections(selections);
    }

    public shrink() {
        const selections = this.selectionsHistory.pop();
        if (selections) {
            this.updateSelections(selections);
        } else {
            commands.executeCommand("editor.action.smartSelect.shrink");
        }
    }

    public dispose() {
        this.windowSelectionListener.dispose();
    }

    private updateSelections(selections: Selection[]) {
        const editor = window.activeTextEditor;
        if (editor && selections.length > 0) {
            this.didUpdateSelections = true;
            editor.selections = selections;
        }
    }

    private updateSelectionsHistory(selections: Selection[]) {
        const lastSelections = this.selectionsHistory.length > 0
            ? this.selectionsHistory[this.selectionsHistory.length - 1]
            : undefined;
        if (lastSelections === undefined || !areSelectionsEqual(lastSelections, selections)) {
            this.selectionsHistory.push([...selections]);
        }
    }
}
