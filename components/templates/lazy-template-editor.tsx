"use client";

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const EditorSkeleton = () => (
    <div className="w-full h-full min-h-[400px] border rounded-md flex flex-col">
        <div className="h-10 border-b flex items-center px-4 gap-2">
            <Skeleton className="h-6 w-6" />
            <Skeleton className="h-6 w-6" />
            <div className="w-px h-6 bg-border mx-2" />
            <Skeleton className="h-6 w-6" />
            <Skeleton className="h-6 w-6" />
        </div>
        <div className="flex-1 p-4">
            <Skeleton className="h-4 w-3/4 mb-4" />
            <Skeleton className="h-4 w-full mb-4" />
            <Skeleton className="h-4 w-full mb-4" />
            <Skeleton className="h-4 w-1/2" />
        </div>
    </div>
);

export const LazyTemplateEditor = dynamic(
    () => import('./template-editor').then((mod) => mod.TemplateEditor),
    {
        ssr: false,
        loading: () => <EditorSkeleton />
    }
);
