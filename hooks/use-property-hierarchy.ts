"use client"

import { useState, useEffect } from "react"
import { API_PERMISSION_CHECK_FAILED_CODE, API_PERMISSION_DENIED_CODE } from "@/lib/permissions-core"

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

/** `error` of the hook if the permission check of the server failed (retry helps), see fetchOptionalList */
export const PERMISSION_CHECK_FAILED_ERROR = 'Permission check failed'

interface PropertyHierarchyState {
  houses: House[]
  apartments: Apartment[]
  tenants: Tenant[]
  isLoading: boolean
  error: string | null
}

/**
 * List endpoint that answers 403 with `code: PERMISSION_DENIED` for a user without the view right: an empty list
 * then. Every other failure is an error, also a 403 without that code (it does not come from the permission check
 * of the route, e.g. from a proxy) and 5xx. A 503 with `code: PERMISSION_CHECK_FAILED` (the permission lookup itself
 * failed, so there is no decision) is an error with its own message, not "no right": the list is not silently empty
 * and the user can retry.
 */
async function fetchOptionalList<T>(url: string, label: string): Promise<T[]> {
  const response = await fetch(url)
  if (response.status === 403 || response.status === 503) {
    const body = await response.json().catch(() => null)
    if (response.status === 403 && body?.code === API_PERMISSION_DENIED_CODE) return []
    if (response.status === 503 && body?.code === API_PERMISSION_CHECK_FAILED_CODE) {
      throw new Error(PERMISSION_CHECK_FAILED_ERROR)
    }
  }
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

  // Bumped by refetch(): runs the effect again (retry after an error)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
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

        if (cancelled) return
        setState({
          houses: houses || [],
          apartments,
          tenants,
          isLoading: false,
          error: null
        })
      } catch (error) {
        console.error('Error fetching property hierarchy:', error)
        if (cancelled) return
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to load data'
        }))
      }
    }

    fetchData()
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const refetch = () => {
    setReloadKey(key => key + 1)
  }

  return {
    ...state,
    refetch
  }
}