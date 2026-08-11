# Phase 4: Restore Missing Shared Libraries

**Status**: STARTING
**Date**: 2026-08-11
**Goal**: Migrate 657 missing-library errors from `@/features/*` imports to new architecture

## Current Baseline
- **Total TS Errors**: 922
- **Missing Shared Library Errors**: 657
- **Other Errors**: 265

## Required Imports (59 unique paths)
```
UI Components: button, skeleton, input, label, badge, dropdown-menu, dialog, card, avatar, 
              textarea, select, scroll-area, popover, field, sheet, checkbox, tabs, form-context, 
              tooltip, table, infobar, switch, separator, command, alert-dialog, tanstack-form, 
              search-select, alert, spinner, progress, slider, segmented-control, radio-group, 
              input-group, info-button, drawer, context-menu, collapsible, accordion, sonner

POS Components: pos-table, pos-page-header, pos-table-pagination, pos-table-card, pos-form-modal, 
               pos-table-toolbar, export-pdf, download-csv

Layout Components: page-container, pharmacy-shell, providers, pharmacy-ui

Modal Components: alert-modal

Theme Components: font.config, theme.config, theme-provider, active-theme

Forms Components: fields

Other: discussions/api
```

## Implementation Order
1. ✅ Verify bridge files in features/ directory
2. ⏳ Implement UI components (highest priority, ~528 errors)
3. ⏳ Implement layout components (~21 errors)
4. ⏳ Implement POS components (~90 errors)
5. ⏳ Implement modal components (~12 errors)
6. ⏳ Implement theme components (~5 errors)
7. ⏳ Implement forms components (1 error)
8. ⏳ Update all imports to new paths
9. ⏳ Run final typecheck and build

## Architecture Rules
- ✅ DO NOT recreate `src/features/` shared libraries
- ✅ UI components: `src/components/ui/`
- ✅ POS components: `src/components/pos/`
- ✅ Layout components: `src/components/layout/`
- ✅ Modal components: `src/components/modal/`
- ✅ Theme logic: `src/lib/themes/`
- ✅ Forms components: `src/components/forms/`
- ✅ Features directory: ONLY redirect/bridge files

## Notes
- Vitest setup file has JSX parsing issue (line 41) - may need React import
- All dependencies already installed (radix-ui, lucide-react, etc.)
- Components already partially exist in new locations
- Bridge files in features/ redirect to new paths
