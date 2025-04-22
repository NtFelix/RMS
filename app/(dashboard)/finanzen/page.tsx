"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlusCircle, ArrowUpCircle, ArrowDownCircle, BarChart3, Wallet } from "lucide-react"
import { FinanceVisualization } from "@/components/finance-visualization"
import { FinanceTransactions } from "@/components/finance-transactions"

export default function FinanzenPage() {
  const totalIncome = 53450.0
  const totalExpenses = 18650.0
  const monthlyCashflow = totalIncome - totalExpenses
  const yearlyProjection = monthlyCashflow * 12

  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Finanzen</h1>
          <p className="text-muted-foreground">Verwalten Sie Ihre Einnahmen und Ausgaben</p>
        </div>
        <Button className="sm:w-auto">
          <PlusCircle className="mr-2 h-4 w-4" />
          Transaktion hinzufügen
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="overflow-hidden rounded-xl border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Einnahmen</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalIncome.toFixed(2).replace(".", ",")} €</div>
            <p className="text-xs text-muted-foreground">Monatliche Mieteinnahmen</p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-xl border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ausgaben</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalExpenses.toFixed(2).replace(".", ",")} €</div>
            <p className="text-xs text-muted-foreground">Monatliche Betriebskosten</p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-xl border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash Flow</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthlyCashflow.toFixed(2).replace(".", ",")} €</div>
            <p className="text-xs text-muted-foreground">Monatlicher Überschuss</p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-xl border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jahresprognose</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{yearlyProjection.toFixed(2).replace(".", ",")} €</div>
            <p className="text-xs text-muted-foreground">Geschätzter Jahresgewinn</p>
          </CardContent>
        </Card>
      </div>

      <FinanceVisualization />

      <FinanceTransactions />
    </div>
  )
}
