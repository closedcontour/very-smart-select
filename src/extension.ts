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

class VerySmartSelect {
    private strategies: { [key:string]: SelectionStrategy | undefined } = {};

    private selectionsHistory: Selection[][] = [];
    private windowSelectionListener: Disposable;
    private didSetSelections: boolean = false;

    constructor() {
        this.strategies["typescript"] = new TypescriptStrategy();
        this.strategies["typescriptreact"] = new TypescriptStrategy();
        this.strategies["javascript"] = new TypescriptStrategy();
        this.strategies["javascriptreact"] = new TypescriptStrategy();
        this.strategies["json"] = new TypescriptStrategy();

        this.windowSelectionListener = window.onDidChangeTextEditorSelection(e => {
            if (this.didSetSelections) {
                this.didSetSelections = false;
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
        this.selectionsHistory.push([...editor.selections]);
        const selections = ranges.map(range =>
            new Selection(doc.positionAt(range.start), doc.positionAt(range.end))
        );
        this.setSelections(selections);
    }

    public shrink() {
        const selections = this.selectionsHistory.pop();
        if (selections) {
            this.setSelections(selections);
        } else {
            commands.executeCommand("editor.action.smartSelect.shrink");
        }
    }

    public dispose() {
        this.windowSelectionListener.dispose();
    }

    private setSelections(selections: Selection[]) {
        const editor = window.activeTextEditor;
        if (editor) {
            this.didSetSelections = true;
            editor.selections = selections;
        }
    }
}
