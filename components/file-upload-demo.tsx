import React from 'react';
import { FileUpload } from '../file-upload';

/**
 * Demo component showing how to use the FileUpload component
 * This is for testing and demonstration purposes
 */
export function FileUploadDemo() {
  const handleUpload = async (files: File[], folderPath: string) => {
    console.log('Uploading files:', files, 'to folder:', folderPath);
    
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate random success/failure for demo
    if (Math.random() > 0.8) {
      throw new Error('Simulated upload error');
    }
    
    console.log('Upload completed successfully');
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-4">File Upload Component Demo</h1>
        <p className="text-gray-600 mb-6">
          This demo shows the FileUpload component with drag-and-drop functionality,
          file validation, progress tracking, and error handling.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-3">Basic Upload (Basic Plan)</h2>
          <FileUpload
            onUpload={handleUpload}
            folderPath="/demo/basic"
            subscriptionPlan="basic"
            currentStorageUsed={50 * 1024 * 1024} // 50MB used
            existingFileNames={['existing-file.pdf', 'another-file.jpg']}
          />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">Premium Upload (Premium Plan)</h2>
          <FileUpload
            onUpload={handleUpload}
            folderPath="/demo/premium"
            subscriptionPlan="premium"
            currentStorageUsed={200 * 1024 * 1024} // 200MB used
            existingFileNames={[]}
          />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">Disabled Upload</h2>
          <FileUpload
            onUpload={handleUpload}
            folderPath="/demo/disabled"
            subscriptionPlan="basic"
            disabled={true}
          />
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">Features Demonstrated:</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Drag and drop file upload</li>
          <li>• File type and size validation</li>
          <li>• Progress tracking during upload</li>
          <li>• Batch upload with queue management</li>
          <li>• Error handling and user feedback</li>
          <li>• Subscription-based limits</li>
          <li>• File name sanitization and uniqueness</li>
          <li>• Responsive design</li>
        </ul>
      </div>
    </div>
  );
}