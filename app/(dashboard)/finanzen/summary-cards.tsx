import { ArrowUpCircle, ArrowDownCircle, BarChart3, Wallet } from "lucide-react"

// Title, icon and description of the Finanzen summary cards. The page renders them with their values and the
// skeleton as placeholders; both read this list so the static texts exist once.
export const YEARLY_SUMMARY_CARDS = [
  {
    title: "Ø Monatliche Einnahmen",
    description: "Durchschnittliche monatliche Einnahmen",
    icon: <ArrowUpCircle className="size-4 text-green-500" />,
  },
  {
    title: "Ø Monatliche Ausgaben",
    description: "Durchschnittliche monatliche Ausgaben",
    icon: <ArrowDownCircle className="size-4 text-red-500" />,
  },
  {
    title: "Ø Monatlicher Cashflow",
    description: "Durchschnittlicher monatlicher Überschuss",
    icon: <Wallet className="size-4 text-muted-foreground" />,
  },
  {
    title: "Jahresprognose",
    description: "Geschätzter Jahresgewinn",
    icon: <BarChart3 className="size-4 text-muted-foreground" />,
  },
]

export const FILTERED_SUMMARY_CARDS = [
  {
    title: "Gefilterte Einnahmen",
    description: "Einnahmen basierend auf aktuellen Filtern",
    icon: <ArrowUpCircle className="size-4 text-green-500" />,
  },
  {
    title: "Gefilterte Ausgaben",
    description: "Ausgaben basierend auf aktuellen Filtern",
    icon: <ArrowDownCircle className="size-4 text-red-500" />,
  },
  {
    title: "Aktueller Saldo",
    description: "Gesamtsaldo aller Transaktionen",
    icon: <Wallet className="size-4 text-muted-foreground" />,
  },
]
