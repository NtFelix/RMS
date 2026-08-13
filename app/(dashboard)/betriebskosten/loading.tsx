import { PageSkeleton } from "@/components/skeletons/page-skeleton"

export default function Loading() {
  return (
    <PageSkeleton
      tabCount={2}
      buttonWidth="w-60 sm:w-[280px]"
      showInstructionGuide={true}
    />
  )
}
