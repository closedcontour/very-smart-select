import { TextEditor } from "vscode";

export interface Range {
    start: number;
    end: number;
}

export interface SelectionStrategy {
    grow(editor: TextEditor): void;
    shrink(editor: TextEditor): void;
}