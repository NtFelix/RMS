
"use client"



import React, { useState, useMemo } from "react"

import { CheckedState } from "@radix-ui/react-checkbox"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import { Checkbox } from "@/components/ui/checkbox"

import { Button } from "@/components/ui/button"

import { ChevronsUpDown, ArrowUp, ArrowDown, Mail, User, Calendar, FileText, MoreVertical } from "lucide-react"



interface Mail {

  id: string;

  date: string;

  subject: string;

  recipient: string;

  status: 'sent' | 'draft';

}



type MailSortKey = "date" | "subject" | "recipient" | "status" | ""

type SortDirection = "asc" | "desc"



interface MailsTableProps {

  mails: Mail[];

  filter: string;

  searchQuery: string;

  selectedMails?: Set<string>;

  onSelectionChange?: (selected: Set<string>) => void;

}



export function MailsTable({ mails, filter, searchQuery, selectedMails: externalSelectedMails, onSelectionChange }: MailsTableProps) {

  const [sortKey, setSortKey] = useState<MailSortKey>("date")

  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")

  const [internalSelectedMails, setInternalSelectedMails] = useState<Set<string>>(new Set())



  const selectedMails = externalSelectedMails ?? internalSelectedMails

  const setSelectedMails = onSelectionChange ?? setInternalSelectedMails



  const sortedAndFilteredData = useMemo(() => {

    let result = [...mails]



    if (filter === "sent") result = result.filter(m => m.status === 'sent')

    else if (filter === "draft") result = result.filter(m => m.status === 'draft')



    if (searchQuery) {

      const q = searchQuery.toLowerCase()

      result = result.filter(m =>

        m.subject.toLowerCase().includes(q) ||

        m.recipient.toLowerCase().includes(q)

      )

    }



    if (sortKey) {

      result.sort((a, b) => {

        let valA = a[sortKey]

        let valB = b[sortKey]



        if (valA === undefined || valA === null) valA = ''

        if (valB === undefined || valB === null) valB = ''



        const strA = String(valA);

        const strB = String(valB);

        return sortDirection === "asc" ? strA.localeCompare(strB) : strB.localeCompare(strA);

      })

    }



    return result

  }, [mails, filter, searchQuery, sortKey, sortDirection])



  const visibleMailIds = useMemo(() => sortedAndFilteredData.map((mail) => mail.id), [sortedAndFilteredData])



  const allSelected = visibleMailIds.length > 0 && visibleMailIds.every((id) => selectedMails.has(id))

  const partiallySelected = visibleMailIds.some((id) => selectedMails.has(id)) && !allSelected



  const handleSelectAll = (checked: CheckedState) => {

    const isChecked = checked === true

    const next = new Set(selectedMails)

    if (isChecked) {

      visibleMailIds.forEach((id) => next.add(id))

    } else {

      visibleMailIds.forEach((id) => next.delete(id))

    }

    setSelectedMails(next)

  }



  const handleSelectMail = (mailId: string, checked: CheckedState) => {

    const isChecked = checked === true

    const next = new Set(selectedMails)

    if (isChecked) {

      next.add(mailId)

    } else {

      next.delete(mailId)

    }

    setSelectedMails(next)

  }



  const handleSort = (key: MailSortKey) => {

    if (sortKey === key) {

      setSortDirection(sortDirection === "asc" ? "desc" : "asc")

    } else {

      setSortKey(key)

      setSortDirection("asc")

    }

  }



  const renderSortIcon = (key: MailSortKey) => {

    if (sortKey !== key) {

      return <ChevronsUpDown className="h-4 w-4 text-muted-foreground dark:text-[#BFC8D9]" />

    }

    return sortDirection === "asc" ? (

      <ArrowUp className="h-4 w-4 dark:text-[#f3f4f6]" />

    ) : (

      <ArrowDown className="h-4 w-4 dark:text-[#f3f4f6]" />

    )

  }



  const TableHeaderCell = ({ sortKey, children, className = '', icon: Icon, sortable = true }: { sortKey: MailSortKey, children: React.ReactNode, className?: string, icon: React.ElementType, sortable?: boolean }) => (

    <TableHead className={`${className} dark:text-[#f3f4f6] group/header`}>

      <div

        onClick={() => sortable && handleSort(sortKey)}

        className={`flex items-center gap-2 p-2 -ml-2 dark:text-[#f3f4f6] ${sortable ? 'cursor-pointer' : ''}`}>

        <Icon className="h-4 w-4 text-muted-foreground dark:text-[#BFC8D9]" />

        {children}

        {sortable && renderSortIcon(sortKey)}

      </div>

    </TableHead>

  )



  return (

    <div className="rounded-lg">

      <div className="overflow-x-auto -mx-4 sm:mx-0">

        <div className="inline-block min-w-full align-middle">

          <Table className="min-w-full">

            <TableHeader>

              <TableRow className="bg-gray-50 dark:bg-[#22272e] dark:text-[#f3f4f6] hover:bg-gray-50 dark:hover:bg-[#22272e] transition-all duration-200 ease-out transform hover:scale-[1.002] active:scale-[0.998] [&:hover_th]:[&:first-child]:rounded-tl-lg [&:hover_th]:[&:last-child]:rounded-tr-lg">

                <TableHead className="w-12 pl-0 pr-0 -ml-2">

                  <div className="flex items-center justify-start w-6 h-6 rounded-md transition-transform duration-100">

                    <Checkbox

                      aria-label="Alle E-Mails auswählen"

                      checked={allSelected ? true : partiallySelected ? "indeterminate" : false}

                      onCheckedChange={handleSelectAll}

                      className="transition-transform duration-100 hover:scale-105"

                    />

                  </div>

                </TableHead>

                <TableHeaderCell sortKey="date" className="w-[150px] dark:text-[#f3f4f6]" icon={Calendar}>Datum</TableHeaderCell>

                <TableHeaderCell sortKey="subject" className="dark:text-[#f3f4f6]" icon={FileText}>Betreff</TableHeaderCell>

                <TableHeaderCell sortKey="recipient" className="dark:text-[#f3f4f6]" icon={User}>Empfänger</TableHeaderCell>

                <TableHeaderCell sortKey="status" className="dark:text-[#f3f4f6]" icon={Mail}>Status</TableHeaderCell>

                <TableHeaderCell sortKey="" className="w-[80px] dark:text-[#f3f4f6] pr-2" icon={MoreVertical} sortable={false}>Aktionen</TableHeaderCell>

              </TableRow>

            </TableHeader>

            <TableBody>

              {sortedAndFilteredData.length === 0 ? (

                <TableRow>

                  <TableCell colSpan={5} className="h-24 text-center">

                    Keine E-Mails gefunden.

                  </TableCell>

                </TableRow>

              ) : (

                sortedAndFilteredData.map((mail, index) => {

                  const isLastRow = index === sortedAndFilteredData.length - 1

                  const isSelected = selectedMails.has(mail.id)

                  

                  return (

                    <TableRow 

                      key={mail.id}

                      className={`relative cursor-pointer transition-all duration-200 ease-out transform hover:scale-[1.005] active:scale-[0.998] ${

                        isSelected 

                          ? `bg-primary/10 dark:bg-primary/20 ${isLastRow ? 'rounded-b-lg' : ''}` 

                          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'

                      }`}

                    >

                      <TableCell 

                        className={`py-4 ${isSelected && isLastRow ? 'rounded-bl-lg' : ''}`} 

                        onClick={(event) => event.stopPropagation()}

                      >

                        <Checkbox

                          aria-label={`E-Mail ${mail.subject} auswählen`}

                          checked={selectedMails.has(mail.id)}

                          onCheckedChange={(checked) => handleSelectMail(mail.id, checked)}

                        />

                      </TableCell>

                      <TableCell className={`font-medium py-4 dark:text-[#f3f4f6]`}>{mail.date}</TableCell>

                      <TableCell className={`py-4 dark:text-[#f3f4f6]`}>{mail.subject}</TableCell>

                      <TableCell className={`py-4 dark:text-[#f3f4f6]`}>{mail.recipient}</TableCell>

                      <TableCell className={`py-4 dark:text-[#f3f4f6]`}>{mail.status}</TableCell>

                      <TableCell 

                        className={`py-2 pr-2 text-right w-[80px] ${isSelected && isLastRow ? 'rounded-br-lg' : ''}`} 

                        onClick={(event) => event.stopPropagation()}

                      >

                        <Button

                          variant="ghost"

                          size="icon"

                          className="h-7 w-7 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"

                        >

                          <span className="sr-only">Menü öffnen</span>

                          <MoreVertical className="h-3.5 w-3.5" />

                        </Button>

                      </TableCell>

                    </TableRow>

                  )

                })

              )}

            </TableBody>

          </Table>

        </div>

      </div>

    </div>

  )

}


