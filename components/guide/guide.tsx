"use client"

import { useEffect } from "react"
import { driver } from "driver.js"
import "driver.js/dist/driver.css"
import { completeOnboarding } from "@/app/onboarding-actions"

interface GuideProps {
  startTour: boolean
}

const Guide: React.FC<GuideProps> = ({ startTour }) => {
  useEffect(() => {
    if (startTour) {
      const driverObj = driver({
        showProgress: true,
        steps: [
          {
            element: "#nav-link-häuser",
            popover: {
              title: "Häuser",
              description: "Erstellen Sie Ihr erstes Haus, um zu beginnen.",
            },
          },
          {
            element: "#add-house-btn",
            popover: {
              title: "Haus hinzufügen",
              description: "Klicken Sie hier, um ein neues Haus zu erstellen.",
            },
          },
          {
            element: 'input[name="name"]',
            popover: {
              title: "Hausdetails",
              description: "Geben Sie die Details Ihres Hauses ein.",
            },
            onNextClick: () => {
              // This is a workaround to handle the modal transition
              setTimeout(() => driverObj.moveNext(), 500)
            },
          },
          {
            element: "#nav-link-wohnungen",
            popover: {
              title: "Wohnungen",
              description: "Erstellen Sie eine Wohnung für Ihr Haus.",
            },
          },
          {
            element: "#add-apartment-btn",
            popover: {
              title: "Wohnung hinzufügen",
              description:
                "Klicken Sie hier, um eine neue Wohnung zu erstellen.",
            },
          },
          {
            element: 'input[name="name"]',
            popover: {
              title: "Wohnungsdetails",
              description: "Geben Sie die Details Ihrer Wohnung ein.",
            },
            onNextClick: () => {
              // This is a workaround to handle the modal transition
              setTimeout(() => driverObj.moveNext(), 500)
            },
          },
          {
            element: "#add-water-meter-btn",
            popover: {
              title: "Wasserzähler",
              description:
                "Fügen Sie einen Wasserzähler zu Ihrer Wohnung hinzu.",
            },
          },
          {
            element: 'input[name="zaehlernummer"]',
            popover: {
              title: "Wasserzählerdetails",
              description: "Geben Sie die Details Ihres Wasserzählers ein.",
            },
            onNextClick: () => {
              // This is a workaround to handle the modal transition
              setTimeout(() => driverObj.moveNext(), 500)
            },
          },
          {
            element: "#nav-link-mieter",
            popover: {
              title: "Mieter",
              description: "Fügen Sie einen Mieter zu Ihrer Wohnung hinzu.",
            },
          },
          {
            element: "#add-tenant-btn",
            popover: {
              title: "Mieter hinzufügen",
              description: "Klicken Sie hier, um einen neuen Mieter zu erstellen.",
            },
          },
          {
            element: 'input[name="name"]',
            popover: {
              title: "Mieterdetails",
              description: "Geben Sie die Details Ihres Mieters ein.",
            },
            onNextClick: () => {
              // This is a workaround to handle the modal transition
              setTimeout(() => driverObj.moveNext(), 500)
            },
          },
          {
            element: "#nav-link-betriebskosten",
            popover: {
              title: "Betriebskosten",
              description: "Erstellen Sie eine Nebenkostenabrechnung.",
            },
          },
          {
            element: "#add-abrechnung-btn",
            popover: {
              title: "Abrechnung hinzufügen",
              description:
                "Klicken Sie hier, um eine neue Abrechnung zu erstellen.",
            },
          },
          {
            element: "#overview-btn",
            popover: {
              title: "Übersicht",
              description:
                "Überprüfen Sie die Abrechnung, bevor Sie sie erstellen.",
            },
          },
        ],
        onDestroyed: () => {
          completeOnboarding(true)
        },
      })
      driverObj.drive()
    }
  }, [startTour])

  return null
}

export default Guide
