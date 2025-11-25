"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { driver, DriveStep } from "driver.js"
import "driver.js/dist/driver.css"

interface TutorialContextType {
  startTour: () => void
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined)

export const useTutorial = () => {
  const context = useContext(TutorialContext)
  if (!context) {
    throw new Error("useTutorial must be used within a TutorialProvider")
  }
  return context
}

const tourSteps: DriveStep[] = [
  {
    element: "#add-house-btn",
    popover: {
      title: "Schritt 1: Haus anlegen",
      description: "Klicken Sie hier, um Ihr erstes Haus zu erstellen. Sie können beliebig viele Häuser anlegen.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#nav-link-wohnungen",
    popover: {
      title: "Schritt 2: Wohnung anlegen",
      description: "Navigieren Sie zur Wohnungsübersicht, um eine neue Wohnung in Ihrem Haus zu erstellen.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#add-apartment-btn",
    popover: {
      title: "Wohnung hinzufügen",
      description: "Fügen Sie hier eine neue Wohnung zu Ihrem ausgewählten Haus hinzu.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#add-water-meter-btn",
    popover: {
      title: "Schritt 3: Wasserzähler hinzufügen",
      description:
        "Nachdem Sie eine Wohnung angelegt haben, können Sie hier einen Wasserzähler für diese Wohnung hinzufügen.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#nav-link-mieter",
    popover: {
      title: "Schritt 4: Mieter anlegen",
      description: "Jetzt legen wir einen Mieter für die neu erstellte Wohnung an.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#add-tenant-btn",
    popover: {
      title: "Mieter hinzufügen",
      description: "Klicken Sie hier, um einen neuen Mieter zu erstellen und einer Wohnung zuzuweisen.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#nav-link-betriebskosten",
    popover: {
      title: "Schritt 5: Nebenkostenabrechnung",
      description: "Zuletzt erstellen wir eine Nebenkostenabrechnung.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#add-betriebskosten-btn",
    popover: {
      title: "Abrechnung erstellen",
      description:
        "Wählen Sie hier die Standardvorlage aus, um eine neue Nebenkostenabrechnung zu erstellen.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#overview-btn",
    popover: {
      title: "Abrechnung prüfen",
      description: "Öffnen Sie die Übersicht, um die Abrechnung zu prüfen, bevor Sie sie finalisieren.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#create-abrechnung-btn",
    popover: {
      title: "Abrechnung finalisieren",
      description: "Hier können Sie die Nebenkostenabrechnung final erstellen und als PDF exportieren.",
      side: "bottom",
      align: "start",
    },
  },
]

export const TutorialProvider: React.FC<{
  children: React.ReactNode
  start: boolean
  onTourComplete: () => void
}> = ({ children, start, onTourComplete }) => {
  useEffect(() => {
    if (start) {
      const driverObj = driver({
        showProgress: true,
        steps: tourSteps,
        onDestroyed: () => {
          onTourComplete()
        },
      })
      driverObj.drive()
    }
  }, [start, onTourComplete])

  const startTour = () => {
    const driverObj = driver({
      showProgress: true,
      steps: tourSteps,
      onDestroyed: () => {
        onTourComplete()
      },
    })
    driverObj.drive()
  }

  return (
    <TutorialContext.Provider value={{ startTour }}>
      {children}
    </TutorialContext.Provider>
  )
}
