---
description: UI Testing and Verification Checklist
---

## How to Test UI Changes

After any UI component change, I will:

1. **Check for Visual Overflow** - Elements should not spill outside their containers
2. **Verify Responsive Grid** - Grids should have proper column counts and gaps
3. **Test Interactive States** - Hover, active, disabled states work correctly
4. **Validate Z-Index Stacking** - Modals/Popups appear above content
5. **Check Dark Theme Compatibility** - All elements visible on dark backgrounds

## Common Issues to Catch

- [ ] Emoji picker overflow
- [ ] Modal backdrop not covering screen
- [ ] Buttons too small for touch targets
- [ ] Text truncation issues
- [ ] Missing hover/focus states

## Browser Testing

// turbo-all
1. Open browser to localhost:5173
2. Test each new component
3. Verify no console errors
