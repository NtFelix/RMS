import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Mail, User, Calendar, FileText, Paperclip, MoreVertical } from "lucide-react"

export default function Loading() {
  return (
    <div className="flex flex-col gap-8 p-8 bg-white dark:bg-[#181818]">
      <div
        className="absolute inset-0 z-[-1]"
        style={{
          backgroundImage: `radial-gradient(circle at top left, rgba(121, 68, 255, 0.05), transparent 20%), radial-gradient(circle at bottom right, rgba(255, 121, 68, 0.05), transparent 20%)`,
        }}
      />

      {/* Stat Cards Skeleton - Exact match */}
      <div className="flex flex-wrap gap-4">
        {[
          { title: "E-Mails Gesamt", width: "w-32" },
          { title: "Ungelesen", width: "w-20" },
          { title: "Gesendet / Entwurf", width: "w-36" }
        ].map((stat, i) => (
          <Card
            key={i}
            className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl flex-1 min-w-[200px]"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2 flex-1">
                  <Skeleton className={`h-3.5 ${stat.width}`} />
                  <Skeleton className="h-7 w-12" />
                </div>
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800">
                  <Skeleton className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Card Skeleton */}
      <Card className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-[2rem]">
        <CardHeader>
          <div className="flex flex-row items-start justify-between">
            <div>
              <Skeleton className="h-7 w-48 mb-2" />
              <Skeleton className="h-4 w-80" />
            </div>
            <div className="mt-1 flex gap-2">
              <Skeleton className="h-9 w-36 rounded-full" />
              <Skeleton className="h-9 w-32 rounded-full" />
            </div>
          </div>
        </CardHeader>
        
        <div className="px-6">
          <div className="h-px bg-gray-200 dark:bg-gray-700 w-full"></div>
        </div>

        <CardContent className="flex flex-col gap-6">
          {/* Tabs and Search Bar Skeleton */}
          <div className="flex flex-col gap-4 mt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {[
                  { label: "Posteingang", width: "w-32" },
                  { label: "Entwürfe", width: "w-28" },
                  { label: "Gesendet", width: "w-28" },
                  { label: "Favoriten", width: "w-28" },
                  { label: "Archiv", width: "w-24" }
                ].map((tab, i) => (
                  <div
                    key={i}
                    className={`h-9 ${tab.width} rounded-full ${
                      i === 0 
                        ? 'bg-primary/10 dark:bg-primary/20' 
                        : 'bg-transparent'
                    } flex items-center justify-center px-4`}
                  >
                    <Skeleton className={`h-4 ${tab.width === "w-32" ? "w-24" : tab.width === "w-28" ? "w-20" : "w-16"}`} />
                  </div>
                ))}
              </div>
              <div className="relative">
                <Skeleton className="h-10 w-[300px] rounded-full" />
              </div>
            </div>
          </div>

          {/* Table Skeleton - Exact structure match */}
          <div className="rounded-lg">
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow className="bg-gray-50 dark:bg-[#22272e] dark:text-[#f3f4f6] hover:bg-gray-50 dark:hover:bg-[#22272e]">
                      <TableHead className="w-12 pl-0 pr-0 -ml-2">
                        <div className="flex items-center justify-start w-6 h-6">
                          <Skeleton className="h-4 w-4 rounded" />
                        </div>
                      </TableHead>
                      <TableHead className="w-[50px]">
                        <div className="flex items-center gap-2 p-2 -ml-2">
                          <Mail className="h-4 w-4 text-muted-foreground dark:text-[#BFC8D9]" />
                          <Skeleton className="h-4 w-4" />
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-2 p-2 -ml-2">
                          <User className="h-4 w-4 text-muted-foreground dark:text-[#BFC8D9]" />
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-4 w-4" />
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-2 p-2 -ml-2">
                          <FileText className="h-4 w-4 text-muted-foreground dark:text-[#BFC8D9]" />
                          <Skeleton className="h-4 w-16" />
                          <Skeleton className="h-4 w-4" />
                        </div>
                      </TableHead>
                      <TableHead className="w-[150px]">
                        <div className="flex items-center gap-2 p-2 -ml-2">
                          <Calendar className="h-4 w-4 text-muted-foreground dark:text-[#BFC8D9]" />
                          <Skeleton className="h-4 w-12" />
                          <Skeleton className="h-4 w-4" />
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-2 p-2 -ml-2">
                          <Paperclip className="h-4 w-4 text-muted-foreground dark:text-[#BFC8D9]" />
                          <Skeleton className="h-4 w-16" />
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-2 p-2 -ml-2">
                          <Mail className="h-4 w-4 text-muted-foreground dark:text-[#BFC8D9]" />
                          <Skeleton className="h-4 w-12" />
                          <Skeleton className="h-4 w-4" />
                        </div>
                      </TableHead>
                      <TableHead className="w-[80px] pr-2">
                        <div className="flex items-center gap-2 p-2 -ml-2">
                          <MoreVertical className="h-4 w-4 text-muted-foreground dark:text-[#BFC8D9]" />
                          <Skeleton className="h-4 w-14" />
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 8 }).map((_, i) => (
                      <TableRow 
                        key={i}
                        className="cursor-pointer transition-all duration-200 ease-out hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <TableCell className="py-4">
                          <Skeleton className="h-4 w-4 rounded" />
                        </TableCell>
                        <TableCell className="py-4">
                          <Skeleton className="h-4 w-4 rounded-full" />
                        </TableCell>
                        <TableCell className="py-4">
                          <Skeleton className="h-4 w-full max-w-[180px]" />
                        </TableCell>
                        <TableCell className="py-4">
                          <Skeleton className="h-4 w-full max-w-[280px]" />
                        </TableCell>
                        <TableCell className="py-4">
                          <Skeleton className="h-4 w-32" />
                        </TableCell>
                        <TableCell className="py-4">
                          {i % 3 === 0 && <Skeleton className="h-4 w-4" />}
                        </TableCell>
                        <TableCell className="py-4">
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                        <TableCell className="py-2 pr-2 text-right w-[80px]">
                          <div className="flex items-center justify-end gap-2">
                            {i % 4 === 0 && <Skeleton className="h-4 w-4 rounded-full" />}
                            {i % 2 === 0 && <Skeleton className="h-4 w-4 rounded-full" />}
                            <Skeleton className="h-7 w-7 rounded" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
