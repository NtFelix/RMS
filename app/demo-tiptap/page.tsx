import { TestTiptapEditor } from '@/components/test-tiptap-editor'

// Disable static generation for this demo page
export const dynamic = 'force-dynamic'

export default function DemoTiptapPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto max-w-4xl">
        <TestTiptapEditor />
      </div>
    </div>
  )
}