import * as vscode from 'vscode';

interface ReplaceConfig {
  replace: string;
  onlyOnEmptyLine?: boolean;
}

function getTodayDate(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

function getNowTime(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function getTimeValue(): string {
  const now = new Date();
  return String(now.getTime());
}

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.workspace.onDidChangeTextDocument(event => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || event.document !== editor.document) return;

    const fileName = editor.document.fileName;
    if (!fileName.endsWith('.cpp') && !fileName.endsWith('.h')) return;

    const config = vscode.workspace.getConfiguration('cppSnippetReplacer');
    const replacements: Record<string, ReplaceConfig> = config.get('replacements') || {};

    const changes = event.contentChanges;
    if (changes.length === 0) return;

    const change = changes[0];
    if (change.text !== ' ') return;

    const position = change.range.start;
    const line = editor.document.lineAt(position.line);
    const lineText = line.text;
    const trimmed = lineText.trim();

    const lineRange = line.range;
    const match = lineText.match(/^(\s*)/); // 앞 빈칸 추출
    const indent = match ? match[1] : '';

    for (const prefix in replacements) {
      if (!prefix.startsWith('//')) continue;
      if (trimmed === prefix) {
        const setting = replacements[prefix];
        const isEmptyLine = lineText.replace(/\t| /g, '') === prefix;

        if (!setting.onlyOnEmptyLine || isEmptyLine) {
          let finalText = setting.replace;
          finalText = finalText.replace('${date}', getTodayDate());
          finalText = finalText.replace('${time}', getNowTime());
          finalText = finalText.replace('${timeValue}', getTimeValue());

          editor.edit(editBuilder => {
            editBuilder.replace(line.range, finalText);
          });
        }
        break;
      }
    }
  });

  context.subscriptions.push(disposable);
}

export function deactivate() { }