'use client';

import { MentionSuggestionList } from '@/components/mention-suggestion-list';
import { MENTION_VARIABLES } from '@/lib/template-constants';
import { Editor, Range } from '@tiptap/react';
import { useState }
from 'react';

const mockEditor = {
  isDestroyed: false,
  isEditable: true,
  state: {
    selection: {
      from: 0,
      to: 0,
    },
  },
  commands: {
    focus: () => true,
  },
} as unknown as Editor;

const mockRange = {
  from: 0,
  to: 0,
} as Range;

export default function TestScrollPage() {
  const [query, setQuery] = useState('');

  const items = MENTION_VARIABLES;

  const filteredItems = items.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Scrollable Dropdown</h1>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="border p-2 mb-4"
        placeholder="Search..."
      />
      <div className="relative w-80">
        <MentionSuggestionList
          items={filteredItems}
          command={() => {}}
          editor={mockEditor}
          range={mockRange}
          query={query}
        />
      </div>
    </div>
  );
}