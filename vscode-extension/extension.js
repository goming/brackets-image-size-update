const vscode = require('vscode');
const path = require('path');
const sizeOf = require('image-size');

function findImgTag(document, cursorOffset) {
    const text = document.getText();
    const regex = /<img[^>]*>/gim;
    let match;
    while ((match = regex.exec(text)) !== null) {
        if (cursorOffset >= match.index && cursorOffset <= match.index + match[0].length) {
            const startPos = document.positionAt(match.index);
            const endPos = document.positionAt(match.index + match[0].length);
            return { tag: match[0], startPos, endPos };
        }
    }
    return null;
}

function updateTag(tag, dimensions) {
    const wAttr = `width="${dimensions.width}"`;
    const hAttr = `height="${dimensions.height}"`;
    let updated = tag;
    if (/width\s*=\s*"[^\"]*"/i.test(updated)) {
        updated = updated.replace(/width\s*=\s*"[^\"]*"/i, wAttr);
    } else {
        updated = updated.replace(/<img/, `<img ${wAttr}`);
    }
    if (/height\s*=\s*"[^\"]*"/i.test(updated)) {
        updated = updated.replace(/height\s*=\s*"[^\"]*"/i, hAttr);
    } else {
        updated = updated.replace(/<img/, `<img ${hAttr}`);
    }
    return updated;
}

function activate(context) {
    let disposable = vscode.commands.registerCommand('extension.updateImageSize', function () {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        const document = editor.document;
        const position = editor.selection.active;
        const offset = document.offsetAt(position);
        const info = findImgTag(document, offset);
        if (!info) {
            vscode.window.showInformationMessage('No img tag at cursor');
            return;
        }
        const srcMatch = info.tag.match(/src\s*=\s*"([^\"]+)"/i);
        if (!srcMatch) {
            vscode.window.showErrorMessage('img tag has no src attribute');
            return;
        }
        const imgPath = path.join(path.dirname(document.uri.fsPath), srcMatch[1]);
        let dimensions;
        try {
            dimensions = sizeOf(imgPath);
        } catch (err) {
            vscode.window.showErrorMessage('Cannot read image: ' + imgPath);
            return;
        }
        const newTag = updateTag(info.tag, dimensions);
        editor.edit(editBuilder => {
            editBuilder.replace(new vscode.Range(info.startPos, info.endPos), newTag);
        });
    });
    context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
