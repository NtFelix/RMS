# Markdown Editor Feature

## Overview

A dedicated full-screen markdown editor has been implemented to improve the experience of creating and editing .md files in the document management system.

## Features

### Full-Screen Editor
- **Immersive editing experience**: The editor opens in a full-screen modal dialog
- **Tabbed interface**: Switch between "Edit" and "Preview" modes
- **Real-time preview**: See how your markdown will render while editing
- **Keyboard shortcuts**: 
  - `Ctrl+S` / `Cmd+S` to save
  - `Ctrl+W` / `Cmd+W` to close

### Editor Capabilities
- **Syntax highlighting**: Monospace font for better code readability
- **Auto-save indication**: Visual indicator when content has unsaved changes
- **Content statistics**: Shows character count and line count
- **File operations**: Download, copy to clipboard, and save functionality

### Integration Points

#### 1. New File Creation
- When creating a new .md file, the editor automatically opens after creation
- Provides a structured template with sections for Description and Content
- Includes creation date in the footer

#### 2. File Opening
- **Direct access**: Clicking on .md files in the file browser opens the editor directly
- **From preview**: .md files in the file preview modal have an "Edit" button
- **Context menu**: Right-click options for editing markdown files

#### 3. File Management
- **Auto-save**: Changes are saved to Supabase Storage
- **Conflict prevention**: Warns before closing with unsaved changes
- **Path validation**: Ensures users can only edit files in their own directories

## Technical Implementation

### Components
- `MarkdownEditorModal`: Main editor component with tabbed interface
- Updated `CreateFileModal`: Opens editor after file creation
- Updated `FilePreviewModal`: Adds edit button for .md files
- Updated `CloudStorageItemCard`: Direct editor access for .md files

### API Endpoints
- `POST /api/dateien/read-file`: Loads file content for editing
- `POST /api/dateien/update-file`: Saves edited content back to storage
- Enhanced `POST /api/dateien/create-file`: Creates files with structured templates

### Modal Store Integration
- New `MarkdownEditorModal` state management
- Integrated with existing modal system
- Supports both new file creation and existing file editing workflows

### Security
- **User isolation**: Files can only be accessed within user's directory (`user_{id}/`)
- **Path validation**: Prevents directory traversal attacks
- **Authentication**: All operations require valid user session

## Usage Examples

### Creating a New Markdown File
1. Navigate to the Documents section
2. Click "New File" button
3. Enter filename (`.md` extension added automatically)
4. Click "Create" - the markdown editor opens immediately
5. Edit content using the full-screen editor
6. Save with `Ctrl+S` or the Save button

### Editing Existing Markdown Files
1. **Method 1**: Click directly on any `.md` file in the file browser
2. **Method 2**: Right-click → Preview → Click "Edit" button
3. **Method 3**: Use file context menu options

### Editor Features
- **Edit Mode**: Full markdown editing with monospace font
- **Preview Mode**: Rendered HTML preview with proper styling
- **Toolbar**: Save, copy, download, and close buttons
- **Status Bar**: Character/line count and keyboard shortcuts

## File Template

New markdown files are created with this structure:

```markdown
# [Filename]

## Beschreibung



## Inhalt



---

*Erstellt am: [Current Date]*
```

## Styling

The editor includes:
- **Responsive design**: Works on different screen sizes
- **Theme integration**: Matches the application's color scheme
- **Typography**: Proper markdown rendering with headings, lists, links, etc.
- **Code highlighting**: Inline code blocks with background styling

## Future Enhancements

Potential improvements could include:
- **Syntax highlighting**: Real-time markdown syntax highlighting in edit mode
- **Live preview**: Side-by-side edit and preview panes
- **Auto-save**: Periodic automatic saving
- **Version history**: Track changes over time
- **Collaborative editing**: Multiple users editing simultaneously
- **Export options**: PDF, HTML, or other format exports
- **Image upload**: Drag-and-drop image insertion
- **Table editor**: Visual table editing interface