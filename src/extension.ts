import * as vscode from 'vscode';

interface ReplaceConfig {
  replace: string;
  onlyOnEmptyLine?: boolean;
  insertAtCurrentPosition?: boolean; // true: 부분 교체, false: 전체 줄 교체
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
    if (change.text !== ' ') return; // 스페이스가 입력되었을 때만 실행

    const position = change.range.start;
    const line = editor.document.lineAt(position.line);
    const lineText = line.text;

    // 들여쓰기 추출
    const match = lineText.match(/^(\s*)/);
    const indent = match ? match[1] : '';

    // 패턴 체크
    for (const prefix in replacements) {
      if (!prefix.startsWith('/')) continue;
      
      const setting = replacements[prefix];
      
      // 스페이스 입력 직전의 텍스트를 확인
      const textBeforeSpace = lineText.slice(0, -1); // 마지막 스페이스 제거
      
      if (textBeforeSpace.endsWith(prefix)) {
        // onlyOnEmptyLine 옵션 체크
        if (setting.onlyOnEmptyLine) {
          const beforePrefix = textBeforeSpace.slice(0, textBeforeSpace.length - prefix.length);
          const isEmptyLine = beforePrefix.trim() === '';
          if (!isEmptyLine) continue;
        }
        
        let finalText = setting.replace;
        
        // 변수 치환
        finalText = finalText.replace(/\$\{date\}/g, getTodayDate());
        finalText = finalText.replace(/\$\{time\}/g, getNowTime());
        finalText = finalText.replace(/\$\{timeValue\}/g, getTimeValue());
        
        if (setting.insertAtCurrentPosition) {
          // prefix + space 전체를 finalText로 교체 (정확한 위치 계산)
          // prefix가 lineText에서 시작하는 위치를 찾음
          const prefixStart = lineText.lastIndexOf(prefix, position.character - 1);
          const startPos = new vscode.Position(position.line, prefixStart);
          const endPos = new vscode.Position(position.line, position.character);
          const replaceRange = new vscode.Range(startPos, endPos);
          // prefix 앞에 이미 indent가 있다면 중복되지 않게 처리
          let indentedFinalText = finalText;
          if (!lineText.slice(0, startPos.character).startsWith(indent)) {
            indentedFinalText = indent + finalText.replace(/^\s+/, '');
          }
          editor.edit(editBuilder => {
            editBuilder.replace(replaceRange, indentedFinalText);
          });
        } else {
          // 줄 전체를 교체 (기존 들여쓰기를 유지하며 치환)
          const lines = finalText.split('\n');
          // 기존 줄의 indent를 유지하며 첫 줄 치환, 이후 줄은 그대로 indent 적용
          // trimStart() 대신 정규식으로 앞 공백 제거 (ES2019 미지원 환경 대응)
          const indentedLines = lines.map((l, idx) => idx === 0 ? indent + l.replace(/^\s+/, '') : indent + l);
          const finalIndentedText = indentedLines.join('\n');
          editor.edit(editBuilder => {
            editBuilder.replace(line.range, finalIndentedText);
          });
        }
        break; // 첫 번째 매치에서 중단
      }
    }
  });

  context.subscriptions.push(disposable);
}

export function deactivate() { }