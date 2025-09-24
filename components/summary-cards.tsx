"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Home, Users, Ruler, Euro } from "lucide-react"

type SummaryCardsProps = {
  totalArea: number
  apartmentCount: number
  tenantCount: number
  totalCosts: number
}

export function SummaryCards({ totalArea, apartmentCount, tenantCount, totalCosts }: SummaryCardsProps) {
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('de-DE').format(value)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value)
  }

  const cards = [
    {
      title: "Gesamtfläche",
      value: `${formatNumber(totalArea)} m²`,
      icon: <Ruler className="h-5 w-5 text-muted-foreground" />,
    },
    {
      title: "Wohnungen",
      value: formatNumber(apartmentCount),
      icon: <Home className="h-5 w-5 text-muted-foreground" />,
    },
    {
      title: "Mieter",
      value: formatNumber(tenantCount),
      icon: <Users className="h-5 w-5 text-muted-foreground" />,
    },
    {
      title: "Gesamtkosten",
      value: formatCurrency(totalCosts),
      icon: <Euro className="h-5 w-5 text-muted-foreground" />,
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className="rounded-2xl shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <div className="h-5 w-5 text-muted-foreground">
              {card.icon}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
