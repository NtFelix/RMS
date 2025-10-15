import { PageSkeleton } from "@/components/page-skeleton"

export default function Loading() {
  return (
    <PageSkeleton
      headerTitleWidth="w-40"
      headerDescriptionWidth="w-64"
      buttonWidth="w-44"
      tableRowCount={6}
    />
  )
}
