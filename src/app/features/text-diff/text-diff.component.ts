import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Meta, Title } from '@angular/platform-browser';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { DiffService, DiffResult, LineDiff, DiffMode } from '../../core/services/diff.service';

type ViewMode = 'unified' | 'split';

@Component({
  selector: 'app-text-diff',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    MatCardModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatButtonToggleModule
  ],
  templateUrl: './text-diff.component.html',
  styleUrl: './text-diff.component.scss'
})
export class TextDiffComponent implements OnInit {
  private meta = inject(Meta);
  private titleService = inject(Title);
  private diffService = inject(DiffService);
  private snackBar = inject(MatSnackBar);

  // Input texts
  originalText = signal('');
  modifiedText = signal('');

  // Options
  ignoreWhitespace = signal(false);
  ignoreCase = signal(false);
  ignorePunctuation = signal(false);
  diffMode = signal<DiffMode>('smart');
  viewMode = signal<ViewMode>('unified');

  // Diff results
  charDiffs = signal<DiffResult[]>([]);
  lineDiffs = signal<LineDiff[]>([]);
  sideBySideDiffs = signal<any[]>([]);

  // Computed stats
  stats = computed(() => {
    const diffs = this.charDiffs();
    if (diffs.length === 0) {
      return { additions: 0, deletions: 0, unchanged: 0, totalChanges: 0 };
    }
    return this.diffService.getDiffStats(diffs);
  });

  hasResults = computed(() => this.charDiffs().length > 0);

  ngOnInit(): void {
    // Update meta tags for SEO and social sharing
    this.titleService.setTitle('Text Diff Tool - Line-by-Line Comparison | Diff Toolbox');
    this.meta.updateTag({
      name: 'description',
      content: 'Professional text comparison tool with line-by-line and word-level granularity. Perfect for code review, document comparison, and content analysis.'
    });
    this.meta.updateTag({
      property: 'og:title',
      content: 'Text Diff Tool - Line-by-Line Comparison | Diff Toolbox'
    });
    this.meta.updateTag({
      property: 'og:description',
      content: 'Professional text comparison tool with line-by-line and word-level granularity. Perfect for code review, document comparison, and content analysis.'
    });
  }

  /**
   * Compute diff between original and modified text
   */
  computeDiff(): void {
    const original = this.originalText();
    const modified = this.modifiedText();

    if (!original && !modified) {
      this.snackBar.open('Please enter text in both fields', 'Close', { duration: 3000 });
      return;
    }

    try {
      const options = {
        ignoreWhitespace: this.ignoreWhitespace(),
        ignoreCase: this.ignoreCase(),
        ignorePunctuation: this.ignorePunctuation(),
        diffMode: this.diffMode()
      };

      // Compute character-level diff
      const charDiff = this.diffService.computeCharDiff(original, modified, options);
      this.charDiffs.set(charDiff);

      // Compute line-level diff
      const lineDiff = this.diffService.computeLineDiff(original, modified, options);
      this.lineDiffs.set(lineDiff);

      // Compute side-by-side diff
      const sideBySide = this.diffService.computeSideBySideDiff(original, modified, options);
      this.sideBySideDiffs.set(sideBySide);

      const stats = this.stats();
      this.snackBar.open(
        `✓ Diff computed: +${stats.additions} -${stats.deletions}`,
        'Close',
        { duration: 3000 }
      );
    } catch (error) {
      this.snackBar.open('Error computing diff', 'Close', { duration: 3000 });
      console.error('Diff error:', error);
    }
  }

  /**
   * Swap original and modified text
   */
  swapTexts(): void {
    const temp = this.originalText();
    this.originalText.set(this.modifiedText());
    this.modifiedText.set(temp);

    // Recompute if there are results
    if (this.hasResults()) {
      this.computeDiff();
    }

    this.snackBar.open('Texts swapped', 'Close', { duration: 2000 });
  }

  /**
   * Clear all inputs and results
   */
  clearAll(): void {
    this.originalText.set('');
    this.modifiedText.set('');
    this.charDiffs.set([]);
    this.lineDiffs.set([]);
    this.sideBySideDiffs.set([]);
    this.snackBar.open('Cleared', 'Close', { duration: 2000 });
  }

  /**
   * Load sample text for demonstration
   */
  loadSample(): void {
    this.originalText.set(`function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price;
  }
  return total;
}

const items = [
  { name: 'Apple', price: 1.50 },
  { name: 'Banana', price: 0.75 }
];

console.log('Total:', calculateTotal(items));`);

    this.modifiedText.set(`function calculateTotal(items, taxRate = 0) {
  let subtotal = 0;
  for (const item of items) {
    subtotal += item.price * item.quantity;
  }
  const tax = subtotal * taxRate;
  return subtotal + tax;
}

const items = [
  { name: 'Apple', price: 1.50, quantity: 3 },
  { name: 'Banana', price: 0.75, quantity: 2 },
  { name: 'Orange', price: 2.00, quantity: 1 }
];

const total = calculateTotal(items, 0.08);
console.log('Total with tax:', total.toFixed(2));`);

    this.snackBar.open('Sample code loaded', 'Close', { duration: 2000 });
  }

  /**
   * Copy diff result to clipboard
   */
  copyDiff(): void {
    const diffs = this.charDiffs();
    if (diffs.length === 0) {
      this.snackBar.open('No diff to copy', 'Close', { duration: 2000 });
      return;
    }

    // Create a text representation of the diff
    const diffText = diffs.map(diff => {
      const prefix = diff.type === 'insert' ? '+ ' : diff.type === 'delete' ? '- ' : '  ';
      return prefix + diff.text;
    }).join('');

    navigator.clipboard.writeText(diffText).then(
      () => {
        this.snackBar.open('✓ Diff copied to clipboard', 'Close', { duration: 2000 });
      },
      () => {
        this.snackBar.open('Failed to copy', 'Close', { duration: 2000 });
      }
    );
  }

  /**
   * Download diff as a file
   */
  downloadDiff(): void {
    const stats = this.stats();
    const timestamp = new Date().toISOString().split('T')[0];

    const header = `# Text Diff - ${timestamp}\n\n`;
    const statsText = `## Statistics\n- Additions: ${stats.additions}\n- Deletions: ${stats.deletions}\n- Unchanged: ${stats.unchanged}\n- Total Changes: ${stats.totalChanges}\n\n`;
    const diffText = `## Diff\n\`\`\`diff\n${this.formatDiffForDownload()}\n\`\`\`\n`;

    const content = header + statsText + diffText;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `diff_${timestamp}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    this.snackBar.open('✓ Diff downloaded', 'Close', { duration: 2000 });
  }

  /**
   * Format diff for download
   */
  private formatDiffForDownload(): string {
    return this.charDiffs().map(diff => {
      const prefix = diff.type === 'insert' ? '+ ' : diff.type === 'delete' ? '- ' : '  ';
      return prefix + diff.text;
    }).join('');
  }

  getDiffClass(type: string): string {
    switch (type) {
      case 'insert': return 'diff-insert';
      case 'delete': return 'diff-delete';
      case 'modified': return 'diff-modified';
      default: return 'diff-equal';
    }
  }

  getCategoryLabel(category: string | undefined): string {
    switch (category) {
      case 'whitespace': return 'Whitespace';
      case 'case': return 'Case';
      case 'punctuation': return 'Punctuation';
      case 'structural': return 'Structural';
      case 'word-replacement': return 'Word';
      default: return '';
    }
  }
}
