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

/** List endpoint that answers 403 for a user without the view right: an empty list then, any other failure is an error */
async function fetchOptionalList<T>(url: string, label: string): Promise<T[]> {
  const response = await fetch(url)
  if (response.status === 403) return []
  if (!response.ok) {
    throw new Error(`Failed to fetch ${label}`)
  }
  return (await response.json()) || []
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

        // Apartments and tenants need wohnungen:ansehen / mieter:ansehen (403 otherwise): without the right they
        // are simply not part of the hierarchy, so the file tree shows neither their names nor their folders
        const [apartments, tenants] = await Promise.all([
          fetchOptionalList<Apartment>('/api/wohnungen', 'apartments'),
          fetchOptionalList<Tenant>('/api/mieter', 'tenants'),
        ])

        setState({
          houses: houses || [],
          apartments,
          tenants,
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