import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { 
  BulkOperationRequest, 
  BulkOperationResponse, 
  BulkOperationError 
} from '@/types/bulk-operations'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError) {
      return NextResponse.json(
        { success: false, error: 'Authentication failed' },
        { status: 401 }
      )
    }
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 401 }
      )
    }

    const body: BulkOperationRequest = await request.json()
    const { operation, tableType, selectedIds, data, validationResult } = body

    // Validate request
    if (!operation || !tableType || !selectedIds || selectedIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid request parameters' },
        { status: 400 }
      )
    }

    // Use validated IDs if validation result is provided
    const idsToProcess = validationResult?.validIds?.length > 0 
      ? validationResult.validIds 
      : selectedIds

    // Handle different bulk operations
    switch (`${tableType}-${operation}`) {
      case 'wohnungen-changeHaus':
        return await handleWohnungenChangeHaus(supabase, user.id, idsToProcess, data, validationResult)
      
      case 'finanzen-changeTyp':
        return await handleFinanzenChangeTyp(supabase, user.id, idsToProcess, data, validationResult)
      
      default:
        return NextResponse.json(
          { success: false, error: `Unsupported operation: ${operation} for table: ${tableType}` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Bulk operation error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function handleWohnungenChangeHaus(
  supabase: any,
  userId: string,
  selectedIds: string[],
  data: Record<string, any>,
  validationResult?: any
): Promise<NextResponse> {
  const hausId = data.hausId as string
  
  if (!hausId) {
    return NextResponse.json(
      { success: false, error: 'House ID is required' },
      { status: 400 }
    )
  }

  const errors: BulkOperationError[] = []
  let updatedCount = 0
  const failedIds: string[] = []

  try {
    // Validate that the house exists and belongs to the user
    const { data: hausData, error: hausError } = await supabase
      .from('Haeuser')
      .select('id')
      .eq('id', hausId)
      .eq('user_id', userId)
      .single()

    if (hausError || !hausData) {
      return NextResponse.json(
        { success: false, error: 'House not found or access denied' },
        { status: 404 }
      )
    }

    // Validate that all selected Wohnungen belong to the user
    const { data: wohnungenData, error: wohnungenError } = await supabase
      .from('Wohnungen')
      .select('id')
      .in('id', selectedIds)
      .eq('user_id', userId)

    if (wohnungenError) {
      return NextResponse.json(
        { success: false, error: 'Failed to validate apartments' },
        { status: 500 }
      )
    }

    const validWohnungIds = wohnungenData?.map((w: { id: string }) => w.id) || []
    const invalidIds = selectedIds.filter(id => !validWohnungIds.includes(id))

    // Add errors for invalid IDs
    invalidIds.forEach((id: string) => {
      errors.push({
        id,
        message: 'Apartment not found or access denied',
        code: 'NOT_FOUND'
      })
      failedIds.push(id)
    })

    // Update valid Wohnungen
    if (validWohnungIds.length > 0) {
      const { error: updateError } = await supabase
        .from('Wohnungen')
        .update({ haus_id: hausId })
        .in('id', validWohnungIds)
        .eq('user_id', userId)

      if (updateError) {
        console.error('Error updating Wohnungen:', updateError)
        
        // If update fails, mark all as failed
        validWohnungIds.forEach((id: string) => {
          errors.push({
            id,
            message: 'Failed to update apartment',
            code: 'UPDATE_FAILED'
          })
          failedIds.push(id)
        })
      } else {
        updatedCount = validWohnungIds.length
      }
    }

    // Revalidate relevant paths
    if (updatedCount > 0) {
      revalidatePath('/wohnungen')
      revalidatePath('/')
      revalidatePath(`/haeuser/${hausId}`)
    }

    const response: BulkOperationResponse = {
      success: updatedCount > 0,
      updatedCount,
      failedIds,
      errors
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in handleWohnungenChangeHaus:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update apartments' },
      { status: 500 }
    )
  }
}

async function handleFinanzenChangeTyp(
  supabase: any,
  userId: string,
  selectedIds: string[],
  data: Record<string, any>,
  validationResult?: any
): Promise<NextResponse> {
  const istEinnahmen = data.ist_einnahmen as boolean
  
  if (typeof istEinnahmen !== 'boolean') {
    return NextResponse.json(
      { success: false, error: 'Type (ist_einnahmen) is required and must be boolean' },
      { status: 400 }
    )
  }

  const errors: BulkOperationError[] = []
  let updatedCount = 0
  const failedIds: string[] = []

  try {
    // Validate that all selected Finanzen belong to the user
    const { data: finanzenData, error: finanzenError } = await supabase
      .from('Finanzen')
      .select('id')
      .in('id', selectedIds)
      .eq('user_id', userId)

    if (finanzenError) {
      return NextResponse.json(
        { success: false, error: 'Failed to validate finance entries' },
        { status: 500 }
      )
    }

    const validFinanzenIds = finanzenData?.map((f: { id: string }) => f.id) || []
    const invalidIds = selectedIds.filter(id => !validFinanzenIds.includes(id))

    // Add errors for invalid IDs
    invalidIds.forEach((id: string) => {
      errors.push({
        id,
        message: 'Finance entry not found or access denied',
        code: 'NOT_FOUND'
      })
      failedIds.push(id)
    })

    // Update valid Finanzen entries
    if (validFinanzenIds.length > 0) {
      const { error: updateError } = await supabase
        .from('Finanzen')
        .update({ ist_einnahmen: istEinnahmen })
        .in('id', validFinanzenIds)
        .eq('user_id', userId)

      if (updateError) {
        console.error('Error updating Finanzen:', updateError)
        
        // If update fails, mark all as failed
        validFinanzenIds.forEach((id: string) => {
          errors.push({
            id,
            message: 'Failed to update finance entry',
            code: 'UPDATE_FAILED'
          })
          failedIds.push(id)
        })
      } else {
        updatedCount = validFinanzenIds.length
      }
    }

    // Revalidate relevant paths
    if (updatedCount > 0) {
      revalidatePath('/finanzen')
      revalidatePath('/')
    }

    const response: BulkOperationResponse = {
      success: updatedCount > 0,
      updatedCount,
      failedIds,
      errors
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in handleFinanzenChangeTyp:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update finance entries' },
      { status: 500 }
    )
  }
}