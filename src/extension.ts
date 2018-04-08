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
        this.strategies["json"] = new TypescriptStrategy();
    }

    private getStrategy(): SelectionStrategy | undefined {
        const editor = window.activeTextEditor;
        if (!editor) {
            return undefined;
        }
        const doc = editor.document;
        const strategy = this.strategies[doc.languageId];
        return strategy;
    }

    public grow() {
        const strategy = this.getStrategy();
        if (strategy === undefined) {
            return;
        }
        strategy.grow(window.activeTextEditor!);
    }

    public shrink() {
        const strategy = this.getStrategy();
        if (strategy === undefined) {
            return;
        }
        strategy.shrink(window.activeTextEditor!);
    }
}