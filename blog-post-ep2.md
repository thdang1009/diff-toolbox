# 1 Day Project - Episode 2: Building a Diff & Convert Toolbox

## Introduction

Welcome back to the **1 Day Project** series! In Episode 2, we're tackling a common developer pain point: comparing and converting data formats. Today, we built a comprehensive **Diff & Convert Toolbox** - a web application that provides three powerful tools for text comparison, JSON analysis, and data format conversion.

## What We Built

A feature-rich web application with three main tools:

1. **Text Diff** - Line-by-line text comparison with word-level granularity
2. **JSON Diff** - Structural JSON comparison with deep nested property detection
3. **JSON/Excel Converter** - Bidirectional conversion between JSON and Excel formats

### Live Demo

🔗 **[Try it now at localhost:4200](http://localhost:4200)**

## Tech Stack

- **Framework**: Angular 18 (Standalone Components)
- **UI Library**: Angular Material
- **State Management**: Angular Signals
- **Diff Algorithm**: diff-match-patch library
- **Excel Processing**: xlsx library
- **Styling**: SCSS with dark mode support

## Key Features

### 1. Text Diff Tool

The Text Diff tool provides professional-grade text comparison capabilities:

#### Features
- **Line-by-line comparison** with precise change detection
- **Word-level granularity** for identifying exact modifications
- **Two view modes**:
  - Unified view (GitHub-style)
  - Split view (side-by-side comparison)
- **Smart options**:
  - Ignore whitespace
  - Ignore case sensitivity
- **Visual indicators**:
  - Green highlights for additions
  - Red highlights for deletions
  - Yellow highlights for modifications
- **Export functionality**:
  - Copy diff to clipboard
  - Download as Markdown file

#### Technical Implementation

The diff algorithm is powered by the `diff-match-patch` library, which provides Myers' diff algorithm for efficient text comparison:

```typescript
computeCharDiff(text1: string, text2: string, options: DiffOptions): DiffResult[] {
  let processedText1 = text1;
  let processedText2 = text2;

  if (options.ignoreWhitespace) {
    processedText1 = text1.replace(/\s+/g, ' ').trim();
    processedText2 = text2.replace(/\s+/g, ' ').trim();
  }

  if (options.ignoreCase) {
    processedText1 = processedText1.toLowerCase();
    processedText2 = processedText2.toLowerCase();
  }

  const diffs = this.dmp.diff_main(processedText1, processedText2);
  this.dmp.diff_cleanupSemantic(diffs);

  return diffs.map(([operation, text]: [number, string]) => ({
    type: operation === 1 ? 'insert' : operation === -1 ? 'delete' : 'equal',
    text: options.ignoreCase ? this.getOriginalCase(text, text1, text2) : text
  }));
}
```

### 2. JSON Diff Tool

The JSON Diff tool provides deep structural analysis of JSON objects:

#### Features
- **Deep nested property comparison** - detects changes at any nesting level
- **Structural diff types**:
  - Added properties (green)
  - Deleted properties (red)
  - Modified values (yellow)
  - Type changes (blue)
  - Unchanged properties (gray, optional)
- **Smart comparison options**:
  - Ignore key order
  - Ignore array order
  - Show/hide unchanged properties
- **Tree visualization** with expandable/collapsible nodes
- **Statistics dashboard** showing counts of each change type
- **Format helpers** for beautifying JSON input
- **Export functionality** with detailed diff reports

#### Technical Deep Dive

The JSON comparison algorithm recursively traverses both objects, building a flat list of diff nodes with full path information:

```typescript
private compareObjects(
  obj1: any,
  obj2: any,
  path: string,
  result: JsonDiffNode[],
  options: JsonDiffOptions
): void {
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  const allKeys = new Set([...keys1, ...keys2]);

  for (const key of allKeys) {
    const newPath = path ? `${path}.${key}` : key;

    if (!(key in obj1)) {
      result.push({ path: newPath, type: 'added', newValue: obj2[key] });
    } else if (!(key in obj2)) {
      result.push({ path: newPath, type: 'deleted', oldValue: obj1[key] });
    } else {
      this.compareValues(obj1[key], obj2[key], newPath, result, options);
    }
  }
}
```

**Key Insight**: Initially, we wrapped nested differences in parent nodes with children arrays. This caused deep nested properties to not display correctly. The fix was to flatten the structure - each property difference gets its own diff node with a complete path (e.g., `address.city`, `address.country`). This ensures all changes are visible, regardless of nesting depth.

### 3. JSON/Excel Converter

The converter tool enables seamless data transformation between JSON and Excel formats:

#### Features
- **JSON to Excel**:
  - Converts JSON arrays to Excel spreadsheets
  - Custom sheet naming
  - Auto-generates column headers from JSON keys
  - Handles nested objects (flattened representation)
  - Download as .xlsx file
- **Excel to JSON**:
  - Drag-and-drop file upload
  - Reads first sheet or all sheets
  - Preserves data types (numbers, strings, booleans)
  - Formatted JSON output
  - Copy to clipboard
- **Smart processing**:
  - Handles arrays of objects
  - Preserves data structure
  - Error handling for invalid formats

#### Technical Implementation

The converter uses the `xlsx` library for Excel file processing:

```typescript
convertJsonToExcel(): void {
  try {
    const json = JSON.parse(this.jsonInput());

    // Ensure we have an array
    const data = Array.isArray(json) ? json : [json];

    // Create worksheet from JSON
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, this.sheetName());

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });

    // Download
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.sheetName()}.xlsx`;
    link.click();
  } catch (error) {
    this.handleError('Invalid JSON format');
  }
}
```

## Architecture Highlights

### 1. Standalone Components

All components are built using Angular 18's standalone component architecture, eliminating the need for NgModules:

```typescript
@Component({
  selector: 'app-json-diff',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    // ... other Material modules
  ],
  templateUrl: './json-diff.component.html',
  styleUrl: './json-diff.component.scss'
})
export class JsonDiffComponent implements OnInit {
  // Component logic
}
```

### 2. Signal-Based State Management

We use Angular Signals for reactive state management, providing better performance and simpler code:

```typescript
// Input signals
originalJson = signal('');
modifiedJson = signal('');

// Options
ignoreKeyOrder = signal(false);
ignoreArrayOrder = signal(false);
showUnchanged = signal(false);

// Results
diffResults = signal<JsonDiffNode[]>([]);

// Computed values
stats = computed(() => {
  const diffs = this.diffResults();
  if (diffs.length === 0) {
    return { added: 0, deleted: 0, modified: 0, unchanged: 0, totalChanges: 0 };
  }
  return this.jsonDiffService.getDiffStats(diffs);
});

hasResults = computed(() => this.diffResults().length > 0);
```

### 3. Service Layer

Each tool has a dedicated service for business logic:

- **`DiffService`** - Text comparison algorithms
- **`JsonDiffService`** - JSON structural comparison
- **`ConverterService`** - Data format conversion (if needed)

### 4. Material Design UI

Clean, responsive interface using Angular Material components:

- Cards for content organization
- Expansion panels for collapsible tree views
- Slide toggles for options
- Button toggles for view modes
- Form fields for text input
- Snack bars for user feedback
- Tooltips for helpful hints

## User Experience Features

### 1. Visual Feedback

- **Color-coded changes**:
  - 🟢 Green for additions
  - 🔴 Red for deletions
  - 🟡 Yellow for modifications
  - 🔵 Blue for type changes
  - ⚪ Gray for unchanged items

- **Statistics dashboard** with gradient background displaying:
  - Added items count
  - Deleted items count
  - Modified items count
  - Unchanged items count
  - Total changes

### 2. Sample Data

Each tool includes a "Load Sample" button that populates the fields with example data, making it easy for users to understand how the tool works.

### 3. Export Options

- **Copy to clipboard** - Quick sharing of results
- **Download as file** - Markdown format for documentation

### 4. Responsive Design

- Mobile-friendly grid layouts
- Adaptive breakpoints (968px, 600px)
- Side-by-side views on desktop
- Stacked views on mobile

### 5. Dark Mode Support

Full dark mode implementation using CSS media queries:

```scss
@media (prefers-color-scheme: dark) {
  .diff-added {
    background-color: #1a3a1a;
    border-left-color: #66bb6a;
  }

  .diff-deleted {
    background-color: #3a1a1a;
    border-left-color: #ef5350;
  }

  .diff-modified {
    background-color: #3a3a1a;
    border-left-color: #fdd835;
  }
}
```

## Privacy & Security

### 100% Client-Side Processing

All operations happen entirely in the browser:

- ✅ No server uploads
- ✅ No data transmission
- ✅ No third-party API calls
- ✅ Complete privacy
- ✅ Works offline (after initial load)

This is prominently displayed in the UI with a lock icon and privacy notice on each tool.

## Challenges & Solutions

### Challenge 1: Deep Nested JSON Comparison

**Problem**: Initially, the JSON diff wasn't showing deeply nested properties. When comparing objects with nested structures, properties like `address.city` or `user.profile.name` weren't appearing in the results.

**Root Cause**: The comparison methods were wrapping all child differences in parent nodes with a `children` array, creating a hierarchical structure that wasn't being properly displayed.

**Solution**: Flattened the diff result structure by having each comparison method directly push diff nodes to the result array with complete paths. This ensures every property difference, regardless of nesting depth, gets its own entry in the results.

```typescript
// Before (incorrect)
const children: JsonDiffNode[] = [];
// ... collect children
result.push({ path: path || 'root', type: 'modified', children: children });

// After (correct)
for (const key of allKeys) {
  const newPath = path ? `${path}.${key}` : key;
  // Directly push to result with full path
  result.push({ path: newPath, type: 'added', newValue: obj2[key] });
}
```

### Challenge 2: Word-Level Diff in Line Mode

**Problem**: Showing both line-level and word-level diffs simultaneously required careful state management.

**Solution**: Computed separate diff results for character-level, line-level, and side-by-side views, allowing the UI to switch between them efficiently using signals.

### Challenge 3: Excel File Type Handling

**Problem**: TypeScript couldn't properly type the `diff-match-patch` and `xlsx` libraries.

**Solution**: Used `@ts-ignore` for the import and typed the instance as `any`, while maintaining type safety in our service interfaces.

## Performance Considerations

1. **Lazy Loading**: All feature components are lazy-loaded via the router
2. **Semantic Cleanup**: The diff algorithm performs semantic cleanup for more readable results
3. **Virtual Scrolling**: For large diffs, consider implementing virtual scrolling (future enhancement)
4. **Signal Optimization**: Computed values only recalculate when their dependencies change

## File Structure

```
src/app/
├── core/
│   └── services/
│       ├── diff.service.ts          # Text diff algorithm
│       └── json-diff.service.ts     # JSON diff algorithm
├── features/
│   ├── text-diff/
│   │   ├── text-diff.component.ts
│   │   ├── text-diff.component.html
│   │   └── text-diff.component.scss
│   ├── json-diff/
│   │   ├── json-diff.component.ts
│   │   ├── json-diff.component.html
│   │   └── json-diff.component.scss
│   └── converter/
│       ├── converter.component.ts
│       ├── converter.component.html
│       └── converter.component.scss
├── shared/
│   └── components/
│       └── navigation/
│           ├── navigation.component.ts
│           ├── navigation.component.html
│           └── navigation.component.scss
├── app.component.ts
├── app.config.ts
└── app.routes.ts
```

## Key Learnings

1. **Flattened Data Structures**: For tree visualizations, sometimes a flat list with path information is more flexible than a nested structure
2. **Signal Patterns**: Computed signals are perfect for derived state like statistics
3. **Algorithm Libraries**: Don't reinvent the wheel - `diff-match-patch` is battle-tested and efficient
4. **User Feedback**: Visual indicators and statistics help users understand changes at a glance
5. **Client-Side Processing**: Processing data entirely client-side provides better privacy and performance

## Future Enhancements

Potential improvements for future iterations:

1. **XML Diff** - Add XML comparison support
2. **CSV Support** - Extend converter to handle CSV files
3. **Diff History** - Save and compare multiple diff sessions
4. **Patch Generation** - Generate and apply patch files
5. **API Testing** - Compare API response JSONs
6. **Merge Tool** - Three-way merge capability
7. **Syntax Highlighting** - Code-aware diff for programming languages
8. **Virtual Scrolling** - Handle very large files efficiently
9. **Custom Themes** - Allow users to customize color schemes
10. **Keyboard Shortcuts** - Power user features

## Deployment

The application is ready for deployment to any static hosting service:

```bash
# Build for production
npm run build

# Output will be in dist/diff-toolbox
# Deploy to: Netlify, Vercel, GitHub Pages, etc.
```

## SEO Optimization

Each route has proper meta tags for search engines and social sharing:

```typescript
ngOnInit(): void {
  this.titleService.setTitle('JSON Diff Tool - Compare JSON Structures | Diff Toolbox');
  this.meta.updateTag({
    name: 'description',
    content: 'Free JSON comparison tool with structural analysis. Ignore key order, whitespace, and array differences. 100% client-side processing for maximum privacy.'
  });
  this.meta.updateTag({
    property: 'og:title',
    content: 'JSON Diff Tool - Compare JSON Structures | Diff Toolbox'
  });
  this.meta.updateTag({
    property: 'og:description',
    content: 'Free JSON comparison tool with structural analysis. Ignore key order, whitespace, and array differences. 100% client-side processing for maximum privacy.'
  });
}
```

## Conclusion

In one day, we built a comprehensive toolbox with three professional-grade utilities:

- ✅ Text Diff with line and word-level comparison
- ✅ JSON Diff with deep structural analysis
- ✅ JSON/Excel Converter with bidirectional conversion

The application demonstrates modern Angular patterns (standalone components, signals), provides excellent UX (Material Design, dark mode, responsive), and prioritizes privacy (100% client-side processing).

## Stats

- **Development Time**: 1 day
- **Lines of Code**: ~2,500
- **Components**: 4 (3 feature components + navigation)
- **Services**: 2 (DiffService, JsonDiffService)
- **Dependencies**: 5 key libraries (Angular, Material, diff-match-patch, xlsx, RxJS)

## Try It Yourself

Clone the repository and run:

```bash
npm install
npm start
```

Visit `http://localhost:4200` to explore all three tools!

---

**Next Episode Preview**: In Episode 3, we'll build a real-time collaborative markdown editor with live preview and syntax highlighting. Stay tuned!

## Resources

- [Angular Documentation](https://angular.io)
- [Angular Material](https://material.angular.io)
- [diff-match-patch Library](https://github.com/google/diff-match-patch)
- [SheetJS (xlsx)](https://github.com/SheetJS/sheetjs)
- [Myers Diff Algorithm](http://www.xmailserver.org/diff2.pdf)

---

*Built with ❤️ using Angular 18*

*Part of the 1 Day Project series - Episode 2*
