# Cloud Storage File Operations

This document describes the file operations implemented for the Cloud Storage Management feature.

## Overview

The file operations provide users with the ability to download, delete (archive), and preview files within the cloud storage system. All operations include visual feedback and error handling.

## Implemented Operations

### 1. File Download
- **Performance Target**: 2-second completion for files under 10MB
- **Implementation**: `triggerFileDownload()` function with timeout handling
- **User Experience**: 
  - Right-click context menu option "Herunterladen"
  - Browser download triggered automatically
  - Toast notification on success/failure
  - Loading state during operation

### 2. File Deletion (Archiving)
- **Behavior**: Files are moved to archive instead of permanent deletion
- **Archive Path**: `user_{uid}/__archive__/{timestamp}/filename`
- **User Experience**:
  - Right-click context menu option "Löschen (Archivieren)"
  - Confirmation dialog before deletion
  - Clear messaging about archiving vs. permanent deletion
  - Toast notification on success/failure

### 3. File Preview
- **Supported Types**: PDF, JPG, JPEG, PNG, GIF, WEBP
- **Features**:
  - Modal dialog with file preview
  - Zoom controls for images (25% to 200%)
  - Rotation controls for images
  - Download button within preview
  - PDF display using iframe

### 4. File Move/Rename (Backend Ready)
- **Implementation**: Storage service functions available
- **Status**: Backend functions implemented, UI to be added in future tasks
- **Functions**: `moveFile()`, `renameFile()`

## Technical Implementation

### Storage Service
- **File**: `lib/storage-service.ts`
- **Key Functions**:
  - `triggerFileDownload()` - Browser download with timeout
  - `deleteFile()` - Archive instead of delete
  - `moveFile()` - Move files between paths
  - `renameFile()` - Rename files in place

### State Management
- **File**: `hooks/use-cloud-storage-store.tsx`
- **Operations State**:
  - `isOperationInProgress` - Loading state
  - `operationError` - Error handling
  - File operation actions with error handling

### UI Components
- **FileContextMenu**: Right-click menu for file operations
- **FilePreviewModal**: Modal for file preview with controls
- **ConfirmationAlertDialog**: Confirmation for destructive operations

## User Experience Features

### Visual Feedback
- Loading indicators during operations
- Toast notifications for success/error states
- Disabled states during operations
- Progress indicators where applicable

### Error Handling
- Network timeout handling (2-second limit for downloads)
- User-friendly error messages
- Graceful degradation for unsupported operations
- Retry mechanisms where appropriate

### Accessibility
- Keyboard navigation support
- Screen reader compatible
- Clear focus indicators
- Semantic HTML structure

## Performance Considerations

### Download Performance
- 2-second timeout for optimal user experience
- Efficient blob handling
- Automatic cleanup of temporary URLs

### Archive System
- Preserves original folder structure
- Timestamp-based organization
- Efficient path construction

### File Type Detection
- Client-side file type detection
- Appropriate icons for different file types
- Conditional feature availability

## Security

### Path Validation
- User path prefix enforcement
- Path sanitization
- Access control validation

### File Validation
- File type restrictions
- Size limitations (10MB for optimal performance)
- Malicious file prevention

## Testing

### Unit Tests
- File operations functionality
- Error handling scenarios
- Performance requirements
- User interaction flows

### Test Coverage
- Context menu interactions
- File download/delete operations
- Preview functionality
- Error states and loading states

## Future Enhancements

### Planned Features
- Bulk file operations
- Advanced file search
- File sharing capabilities
- Enhanced preview for more file types

### Performance Optimizations
- Lazy loading for large file lists
- Caching for frequently accessed files
- Background processing for large operations