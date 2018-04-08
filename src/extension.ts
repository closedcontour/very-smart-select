import { window, ExtensionContext, commands }  from 'vscode';
import { SelectionStrategy } from './api';
import { TypescriptStrategy } from './languages/typescript';

export function activate(context: ExtensionContext) {
    const verySmartSelect = new VerySmartSelect();
    let growCommand = commands.registerCommand('very-smart-select.grow', () => {
        verySmartSelect.grow();
    });
    let shrinkCommand = commands.registerCommand('very-smart-select.shrink', () => {
        verySmartSelect.shrink();
    });

    context.subscriptions.push(growCommand);
    context.subscriptions.push(shrinkCommand);
}

export function deactivate() {
}

class VerySmartSelect {
    private strategies: {[key:string]: SelectionStrategy | undefined} = {};
    constructor() {
        this.strategies["typescript"] = new TypescriptStrategy();
        this.strategies["typescriptreact"] = new TypescriptStrategy();
        this.strategies["javascript"] = new TypescriptStrategy();
        this.strategies["javascriptreact"] = new TypescriptStrategy();
    }

    public grow() {
        const editor = window.activeTextEditor;
        if (!editor) {
            return;
        }
        const doc = editor.document;
        const strategy = this.strategies[doc.languageId];
        if (strategy !== undefined) {
            strategy.grow(editor);
        }
    }

    public shrink() {
        console.log("shrink not yet supported");
    }
}