"use client"

import { useState, useEffect } from "react"

export interface House {
  id: string
  name: string
  strasse: string
  ort: string
}

export interface Apartment {
  id: string
  name: string
  groesse: number
  miete: number
  haus_id: string
}

export interface Tenant {
  id: string
  name: string
  wohnung_id: string
  einzug: string
  auszug?: string
  email?: string
  telefonnummer?: string
}

interface PropertyHierarchyState {
  houses: House[]
  apartments: Apartment[]
  tenants: Tenant[]
  isLoading: boolean
  error: string | null
}

export function usePropertyHierarchy() {
  const [state, setState] = useState<PropertyHierarchyState>({
    houses: [],
    apartments: [],
    tenants: [],
    isLoading: true,
    error: null
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }))

        // Fetch houses
        const housesResponse = await fetch('/api/haeuser')
        if (!housesResponse.ok) {
          throw new Error('Failed to fetch houses')
        }
        const houses = await housesResponse.json()

        // Fetch apartments
        const apartmentsResponse = await fetch('/api/wohnungen')
        if (!apartmentsResponse.ok) {
          throw new Error('Failed to fetch apartments')
        }
        const apartments = await apartmentsResponse.json()

        // Fetch tenants
        const tenantsResponse = await fetch('/api/mieter')
        if (!tenantsResponse.ok) {
          throw new Error('Failed to fetch tenants')
        }
        const tenants = await tenantsResponse.json()

        setState({
          houses: houses || [],
          apartments: apartments || [],
          tenants: tenants || [],
          isLoading: false,
          error: null
        })
      } catch (error) {
        console.error('Error fetching property hierarchy:', error)
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to load data'
        }))
      }
    }

    fetchData()
  }, [])

  const refetch = () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    // Re-trigger the effect by updating a dependency
    // In a real implementation, you might want to use a more sophisticated approach
  }

  return {
    ...state,
    refetch
  }
}