import { Injectable } from '@angular/core';
// @ts-ignore
import DiffMatchPatch from 'diff-match-patch';

export type DiffChangeCategory = 'whitespace' | 'case' | 'punctuation' | 'word-replacement' | 'structural';
export type DiffMode = 'strict' | 'smart';

export interface DiffResult {
  type: 'equal' | 'insert' | 'delete';
  text: string;
}

export interface LineDiff {
  lineNumber: number;
  type: 'equal' | 'insert' | 'delete' | 'modified';
  oldText?: string;
  newText?: string;
  wordDiffs?: DiffResult[];
  oldWordDiffs?: DiffResult[];
  newWordDiffs?: DiffResult[];
  changeCategory?: DiffChangeCategory;
}

export interface DiffOptions {
  ignoreWhitespace?: boolean;
  ignoreCase?: boolean;
  ignorePunctuation?: boolean;
  normalizeInput?: boolean;
  diffMode?: DiffMode;
  contextLines?: number;
}

@Injectable({
  providedIn: 'root'
})
export class DiffService {
  private dmp: any;

  constructor() {
    this.dmp = new DiffMatchPatch();
    this.dmp.Diff_EditCost = 4;
  }

  preprocessText(text: string, options: DiffOptions): string {
    let result = text;
    if (options.diffMode === 'smart' || options.normalizeInput) {
      result = result.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      result = result.split('\n').map(l => l.replace(/[ \t]+/g, ' ').trimEnd()).join('\n');
      result = result.normalize('NFC');
      result = result.replace(/[""]/g, '"').replace(/['']/g, "'");
    }
    if (options.ignoreWhitespace) {
      result = result.replace(/\s+/g, ' ').trim();
    }
    if (options.ignoreCase) {
      result = result.toLowerCase();
    }
    if (options.ignorePunctuation) {
      // \p{L} = all Unicode letters (includes Vietnamese á à ơ ư ă etc.)
      // \p{N} = all Unicode numbers
      // keeps letters, numbers, whitespace; strips only punctuation/symbols
      result = result.replace(/[^\p{L}\p{N}\s]/gu, '');
    }
    return result;
  }

  /**
   * Word-level diff using the word-to-char encoding trick.
   * Line → Word is the primary diff strategy; Character is used only as fallback
   * within the word diff when DMP's semantic cleanup merges adjacent tokens.
   */
  computeWordDiff(text1: string, text2: string): DiffResult[] {
    const words1 = this.tokenizeWords(text1);
    const words2 = this.tokenizeWords(text2);

    if (!words1.length && !words2.length) return [];

    const wordToChar = new Map<string, string>();
    let charCode = 0xe000;

    const encode = (words: string[]) =>
      words.map(w => {
        if (!wordToChar.has(w)) wordToChar.set(w, String.fromCodePoint(charCode++));
        return wordToChar.get(w)!;
      }).join('');

    const e1 = encode(words1);
    const e2 = encode(words2);
    const charToWord = new Map([...wordToChar].map(([w, c]) => [c, w]));

    const diffs = this.dmp.diff_main(e1, e2, false);
    this.dmp.diff_cleanupSemantic(diffs);

    return diffs.map(([op, chars]: [number, string]) => ({
      type: op === 1 ? 'insert' : op === -1 ? 'delete' : ('equal' as const),
      text: [...chars].map(c => charToWord.get(c) ?? c).join('')
    }));
  }

  classifyChange(oldText: string, newText: string): DiffChangeCategory {
    const t1 = oldText.trim();
    const t2 = newText.trim();
    if (t1 === t2) return 'whitespace';
    if (t1.toLowerCase() === t2.toLowerCase()) return 'case';
    const strip = (s: string) => s.replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();
    if (strip(t1).toLowerCase() === strip(t2).toLowerCase()) return 'punctuation';
    const w1 = t1.split(/\s+/).length;
    const w2 = t2.split(/\s+/).length;
    if (Math.abs(w1 - w2) > Math.max(w1, w2) * 0.5) return 'structural';
    return 'word-replacement';
  }

  computeCharDiff(text1: string, text2: string, options: DiffOptions = {}): DiffResult[] {
    const t1 = this.preprocessText(text1, options);
    const t2 = this.preprocessText(text2, options);
    const diffs = this.dmp.diff_main(t1, t2);
    this.dmp.diff_cleanupSemantic(diffs);
    return diffs.map(([op, text]: [number, string]) => ({
      type: op === 1 ? 'insert' : op === -1 ? 'delete' : ('equal' as const),
      text
    }));
  }

  /**
   * Hierarchical diff: Line → Word.
   * Consecutive delete+insert pairs are merged into 'modified' with word-level diffs.
   */
  computeLineDiff(text1: string, text2: string, options: DiffOptions = {}): LineDiff[] {
    const t1 = this.preprocessText(text1, options);
    const t2 = this.preprocessText(text2, options);

    const diffs = this.dmp.diff_main(t1, t2, true);
    this.dmp.diff_cleanupSemantic(diffs);

    const raw: LineDiff[] = [];
    let currentLine = 0;

    for (const [op, text] of diffs as [number, string][]) {
      const lines = text.split('\n');
      if (lines[lines.length - 1] === '') lines.pop();

      for (const line of lines) {
        currentLine++;
        if (op === 0) {
          raw.push({ lineNumber: currentLine, type: 'equal', oldText: line, newText: line });
        } else if (op === -1) {
          raw.push({ lineNumber: currentLine, type: 'delete', oldText: line });
        } else {
          raw.push({ lineNumber: currentLine, type: 'insert', newText: line });
        }
      }
    }

    return this.pairModifiedLines(raw);
  }

  computeSideBySideDiff(text1: string, text2: string, options: DiffOptions = {}): any[] {
    const lineDiffs = this.computeLineDiff(text1, text2, options);
    const result: any[] = [];

    for (const diff of lineDiffs) {
      if (diff.type === 'equal') {
        result.push({
          lineNumber: diff.lineNumber,
          left: { text: diff.oldText!, type: 'equal' },
          right: { text: diff.newText!, type: 'equal' }
        });
      } else if (diff.type === 'modified') {
        result.push({
          lineNumber: diff.lineNumber,
          left: { text: diff.oldText!, type: 'modified' },
          right: { text: diff.newText!, type: 'modified' },
          wordDiffs: { left: diff.oldWordDiffs!, right: diff.newWordDiffs! },
          changeCategory: diff.changeCategory
        });
      } else if (diff.type === 'delete') {
        result.push({ lineNumber: diff.lineNumber, left: { text: diff.oldText!, type: 'delete' } });
      } else {
        result.push({ lineNumber: diff.lineNumber, right: { text: diff.newText!, type: 'insert' } });
      }
    }

    return result;
  }

  getDiffStats(diffs: DiffResult[]) {
    let additions = 0, deletions = 0, unchanged = 0;
    for (const { type, text } of diffs) {
      if (type === 'insert') additions += text.length;
      else if (type === 'delete') deletions += text.length;
      else unchanged += text.length;
    }
    return { additions, deletions, unchanged, totalChanges: additions + deletions };
  }

  createPatch(text1: string, text2: string): string {
    const diffs = this.dmp.diff_main(text1, text2);
    this.dmp.diff_cleanupSemantic(diffs);
    return this.dmp.patch_toText(this.dmp.patch_make(text1, diffs));
  }

  applyPatch(text: string, patchText: string): { text: string; success: boolean } {
    const [patchedText, results] = this.dmp.patch_apply(this.dmp.patch_fromText(patchText), text);
    return { text: patchedText, success: results.every((r: boolean) => r) };
  }

  private tokenizeWords(text: string): string[] {
    return text.match(/\S+|\s+/g) ?? [];
  }

  private pairModifiedLines(raw: LineDiff[]): LineDiff[] {
    const result: LineDiff[] = [];
    let i = 0;

    while (i < raw.length) {
      const cur = raw[i];
      if (cur.type === 'delete' && i + 1 < raw.length && raw[i + 1].type === 'insert') {
        const next = raw[i + 1];
        const wordDiffs = this.computeWordDiff(cur.oldText!, next.newText!);
        const { left, right } = this.splitWordDiffs(wordDiffs);
        result.push({
          lineNumber: cur.lineNumber,
          type: 'modified',
          oldText: cur.oldText,
          newText: next.newText,
          wordDiffs,
          oldWordDiffs: left,
          newWordDiffs: right,
          changeCategory: this.classifyChange(cur.oldText!, next.newText!)
        });
        i += 2;
      } else {
        result.push(cur);
        i++;
      }
    }

    return result;
  }

  private splitWordDiffs(wordDiffs: DiffResult[]): { left: DiffResult[]; right: DiffResult[] } {
    const left: DiffResult[] = [];
    const right: DiffResult[] = [];
    for (const diff of wordDiffs) {
      if (diff.type === 'delete') left.push(diff);
      else if (diff.type === 'insert') right.push(diff);
      else { left.push(diff); right.push(diff); }
    }
    return { left, right };
  }
}
