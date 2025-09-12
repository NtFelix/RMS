# Template Editor Troubleshooting Guide

## Common Issues and Solutions

### Mention Suggestions Not Appearing

#### Problem
The suggestion modal doesn't appear when typing `@` in the editor.

#### Possible Causes & Solutions

1. **Missing Dependencies**
   ```bash
   # Check if all required packages are installed
   npm list @tiptap/suggestion @tiptap/react-renderer tippy.js
   
   # Install missing dependencies
   npm install @tiptap/suggestion @tiptap/react-renderer tippy.js
   ```

2. **Editor Not Focused**
   - **Cause**: The editor needs to be focused for suggestions to work
   - **Solution**: Click inside the editor area before typing `@`

3. **JavaScript Errors**
   - **Cause**: Console errors preventing suggestion initialization
   - **Solution**: Check browser console for errors and resolve them

4. **SSR Issues**
   - **Cause**: Server-side rendering conflicts with TipTap
   - **Solution**: Ensure `immediatelyRender: false` is set in editor config
   ```tsx
   const editor = useEditor({
     immediatelyRender: false, // Important for SSR
     extensions: [/* ... */],
   });
   ```

### Suggestion Modal Positioning Issues

#### Problem
The suggestion modal appears in the wrong position or goes off-screen.

#### Solutions

1. **Viewport Awareness**
   - The editor includes viewport-aware positioning
   - Ensure the editor container has proper CSS positioning

2. **Container Overflow**
   ```css
   .editor-container {
     position: relative;
     overflow: visible; /* Don't clip the suggestion modal */
   }
   ```

3. **Z-Index Issues**
   ```css
   .tippy-box {
     z-index: 9999; /* Ensure modal appears above other content */
   }
   ```

### Keyboard Navigation Not Working

#### Problem
Arrow keys don't navigate through suggestions or Enter doesn't select items.

#### Solutions

1. **Focus Management**
   - Ensure the suggestion modal receives proper focus
   - Check that `onKeyDown` handlers are properly attached

2. **Event Propagation**
   ```tsx
   const handleKeyDown = (event: KeyboardEvent) => {
     event.preventDefault(); // Prevent default browser behavior
     event.stopPropagation(); // Stop event bubbling
     // Handle navigation...
   };
   ```

3. **Browser Compatibility**
   - Test in different browsers
   - Some browsers may handle keyboard events differently

### Performance Issues

#### Problem
The editor becomes slow when typing or filtering suggestions.

#### Solutions

1. **Debounced Filtering**
   - The editor uses debounced filtering (150ms delay)
   - Increase debounce delay if still experiencing issues:
   ```tsx
   const debouncedFilter = useMemo(() => {
     return debounce(filterFunction, 300); // Increase to 300ms
   }, []);
   ```

2. **Limit Suggestion Count**
   ```tsx
   // In suggestion configuration
   items: ({ query }) => {
     return filterMentionVariables(MENTION_VARIABLES, query)
       .slice(0, 5); // Reduce from 10 to 5 items
   }
   ```

3. **Memory Leaks**
   - Ensure proper cleanup of Tippy.js instances
   - Check for event listener cleanup

### Styling Issues

#### Problem
Suggestion modal or mentions don't display correctly.

#### Solutions

1. **CSS Import Order**
   ```tsx
   // Ensure CSS is imported in correct order
   import '@/styles/template-editor.css';
   import '@/styles/mention-suggestion.css';
   ```

2. **Tailwind CSS Conflicts**
   ```css
   /* Use !important if Tailwind classes are being overridden */
   .mention-variable {
     background-color: rgb(59 130 246 / 0.1) !important;
     color: rgb(59 130 246) !important;
   }
   ```

3. **Dark Mode Issues**
   ```css
   /* Ensure dark mode compatibility */
   .dark .mention-suggestion-modal {
     background-color: hsl(var(--popover));
     color: hsl(var(--popover-foreground));
   }
   ```

### Accessibility Issues

#### Problem
Screen readers don't announce suggestions or navigation doesn't work with assistive technologies.

#### Solutions

1. **ARIA Attributes**
   - Verify all required ARIA attributes are present
   - Test with screen reader software

2. **Focus Management**
   ```tsx
   // Ensure proper focus management
   useEffect(() => {
     if (selectedIndex >= 0 && suggestionRefs.current[selectedIndex]) {
       suggestionRefs.current[selectedIndex].focus();
     }
   }, [selectedIndex]);
   ```

3. **Live Regions**
   ```tsx
   // Add live region for dynamic announcements
   <div aria-live="polite" aria-atomic="true" className="sr-only">
     {selectedItem ? `Selected: ${selectedItem.label}` : ''}
   </div>
   ```

### Integration Issues

#### Problem
The editor doesn't work properly when integrated with forms or modals.

#### Solutions

1. **Form Integration**
   ```tsx
   // Use Controller from react-hook-form
   <Controller
     name="content"
     control={control}
     render={({ field }) => (
       <TemplateEditor
         content={field.value}
         onChange={(html) => field.onChange(html)}
       />
     )}
   />
   ```

2. **Modal Integration**
   ```tsx
   // Ensure proper z-index and portal rendering
   <Dialog>
     <DialogContent className="z-50">
       <TemplateEditor />
     </DialogContent>
   </Dialog>
   ```

3. **State Management**
   ```tsx
   // Avoid state conflicts
   const [editorContent, setEditorContent] = useState('');
   
   // Use useEffect to sync external state changes
   useEffect(() => {
     if (externalContent !== editorContent) {
       setEditorContent(externalContent);
     }
   }, [externalContent]);
   ```

## Error Messages and Solutions

### "ReactRenderer is not defined"

**Error**: `ReferenceError: ReactRenderer is not defined`

**Solution**: Install the missing dependency
```bash
npm install @tiptap/react-renderer
```

### "Cannot read property 'clientRect' of undefined"

**Error**: Positioning error in suggestion modal

**Solution**: Add null checks in suggestion configuration
```tsx
onUpdate: (props) => {
  if (!props.clientRect || !popup) return;
  
  popup.setProps({
    getReferenceClientRect: () => props.clientRect?.() || new DOMRect(),
  });
}
```

### "Tippy instance already destroyed"

**Error**: Cleanup error when suggestion modal is destroyed

**Solution**: Add proper cleanup checks
```tsx
onExit: () => {
  try {
    popup?.destroy();
    component?.destroy();
  } catch (error) {
    console.warn('Cleanup error:', error);
  }
}
```

## Performance Monitoring

### Enable Performance Monitoring

```tsx
import { suggestionPerformanceMonitor } from '@/lib/mention-suggestion-performance';

// Monitor suggestion performance
const endTiming = suggestionPerformanceMonitor.startTiming('suggestion-filter');
// ... perform filtering operation
const duration = endTiming();

if (duration > 100) {
  console.warn('Slow suggestion filtering:', duration + 'ms');
}
```

### Performance Metrics

Monitor these key metrics:
- **Suggestion Filter Time**: Should be < 50ms
- **Render Time**: Should be < 100ms
- **Memory Usage**: Check for memory leaks
- **Event Handler Count**: Ensure proper cleanup

## Browser Compatibility

### Supported Browsers

| Browser | Version | Status | Notes |
|---------|---------|--------|-------|
| Chrome | 90+ | ✅ Full Support | Recommended |
| Firefox | 88+ | ✅ Full Support | |
| Safari | 14+ | ✅ Full Support | |
| Edge | 90+ | ✅ Full Support | |
| Mobile Safari | 14+ | ✅ Full Support | Touch optimized |
| Chrome Mobile | 90+ | ✅ Full Support | Touch optimized |

### Known Issues

1. **Internet Explorer**: Not supported (TipTap requires modern JavaScript features)
2. **Older Safari**: Some CSS features may not work in Safari < 14
3. **Mobile Browsers**: Touch events may need additional handling

## Debug Mode

### Enable Debug Logging

```tsx
// Add to your environment variables
NEXT_PUBLIC_DEBUG_TEMPLATE_EDITOR=true

// Or enable programmatically
window.DEBUG_TEMPLATE_EDITOR = true;
```

### Debug Information

When debug mode is enabled, you'll see:
- Suggestion lifecycle events
- Performance timing information
- Error details and stack traces
- Keyboard event handling

## Getting Help

### Before Reporting Issues

1. **Check Console**: Look for JavaScript errors
2. **Test in Isolation**: Try the editor in a minimal setup
3. **Browser Testing**: Test in different browsers
4. **Version Check**: Ensure all dependencies are up to date

### Reporting Issues

Include the following information:
- Browser and version
- Operating system
- Steps to reproduce
- Console error messages
- Expected vs actual behavior
- Minimal code example

### Useful Debug Commands

```bash
# Check package versions
npm list @tiptap/core @tiptap/react @tiptap/extension-mention

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Run tests to verify functionality
npm test -- --testPathPatterns="template-editor"
```