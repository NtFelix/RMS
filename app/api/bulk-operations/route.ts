import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { 
  BulkOperationRequest, 
  BulkOperationResponse, 
  BulkOperationError 
} from '@/types/bulk-operations'

// Enhanced error codes for better client-side handling
const ERROR_CODES = {
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  INVALID_REQUEST: 'INVALID_REQUEST',
  UNSUPPORTED_OPERATION: 'UNSUPPORTED_OPERATION',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  NOT_FOUND: 'NOT_FOUND',
  UPDATE_FAILED: 'UPDATE_FAILED',
  DATABASE_ERROR: 'DATABASE_ERROR',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
} as const

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Authentication failed',
          errors: [{ id: 'auth', message: 'Authentication failed', code: ERROR_CODES.AUTHENTICATION_FAILED }],
          updatedCount: 0,
          failedIds: []
        },
        { status: 401 }
      )
    }
    if (!user) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'User not found',
          errors: [{ id: 'user', message: 'User not found', code: ERROR_CODES.USER_NOT_FOUND }],
          updatedCount: 0,
          failedIds: []
        },
        { status: 401 }
      )
    }

    const body: BulkOperationRequest = await request.json()
    const { operation, tableType, selectedIds, data, validationResult } = body

    // Validate request
    if (!operation || !tableType || !selectedIds || selectedIds.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request parameters',
          errors: [{ id: 'request', message: 'Invalid request parameters', code: ERROR_CODES.INVALID_REQUEST }],
          updatedCount: 0,
          failedIds: selectedIds || []
        },
        { status: 400 }
      )
    }

    // Use validated IDs if validation result is provided
    const idsToProcess = validationResult?.validIds && validationResult.validIds.length > 0 
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
          { 
            success: false, 
            error: `Unsupported operation: ${operation} for table: ${tableType}`,
            errors: [{ 
              id: 'operation', 
              message: `Unsupported operation: ${operation} for table: ${tableType}`, 
              code: ERROR_CODES.UNSUPPORTED_OPERATION 
            }],
            updatedCount: 0,
            failedIds: selectedIds
          },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Bulk operation error:', error)
    
    // Determine error type for better client handling
    let errorCode: (typeof ERROR_CODES)[keyof typeof ERROR_CODES] = ERROR_CODES.INTERNAL_ERROR
    let statusCode = 500
    let errorMessage = 'Internal server error'
    
    if (error instanceof SyntaxError) {
      errorCode = ERROR_CODES.INVALID_REQUEST
      statusCode = 400
      errorMessage = 'Invalid JSON in request body'
    } else if (error instanceof TypeError && error.message.includes('fetch')) {
      errorCode = ERROR_CODES.DATABASE_ERROR
      errorMessage = 'Database connection failed'
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        errors: [{ id: 'server', message: errorMessage, code: errorCode }],
        updatedCount: 0,
        failedIds: []
      },
      { status: statusCode }
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
      { 
        success: false, 
        error: 'House ID is required',
        errors: [{ id: 'hausId', message: 'House ID is required', code: ERROR_CODES.VALIDATION_FAILED }],
        updatedCount: 0,
        failedIds: selectedIds
      },
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
        { 
          success: false, 
          error: 'House not found or access denied',
          errors: [{ id: hausId, message: 'House not found or access denied', code: ERROR_CODES.NOT_FOUND }],
          updatedCount: 0,
          failedIds: selectedIds
        },
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
      console.error('Database error validating apartments:', wohnungenError)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to validate apartments',
          errors: [{ id: 'database', message: 'Failed to validate apartments', code: ERROR_CODES.DATABASE_ERROR }],
          updatedCount: 0,
          failedIds: selectedIds
        },
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
        code: ERROR_CODES.NOT_FOUND
      })
      failedIds.push(id)
    })

    // Update valid Wohnungen in batches to handle large datasets
    if (validWohnungIds.length > 0) {
      const batchSize = 100 // Process in batches of 100
      const batches = []
      
      for (let i = 0; i < validWohnungIds.length; i += batchSize) {
        batches.push(validWohnungIds.slice(i, i + batchSize))
      }
      
      let batchUpdatedCount = 0
      
      for (const batch of batches) {
        try {
          const { error: updateError, count } = await supabase
            .from('Wohnungen')
            .update({ haus_id: hausId })
            .in('id', batch)
            .eq('user_id', userId)

          if (updateError) {
            console.error('Error updating Wohnungen batch:', updateError)
            
            // Mark this batch as failed
            batch.forEach((id: string) => {
              errors.push({
                id,
                message: 'Failed to update apartment',
                code: ERROR_CODES.UPDATE_FAILED
              })
              failedIds.push(id)
            })
          } else {
            batchUpdatedCount += count || batch.length
          }
        } catch (batchError) {
          console.error('Batch update error:', batchError)
          
          // Mark this batch as failed
          batch.forEach((id: string) => {
            errors.push({
              id,
              message: 'Database error during update',
              code: ERROR_CODES.DATABASE_ERROR
            })
            failedIds.push(id)
          })
        }
      }
      
      updatedCount = batchUpdatedCount
    }

    // Revalidate relevant paths
    if (updatedCount > 0) {
      try {
        revalidatePath('/wohnungen')
        revalidatePath('/')
        revalidatePath(`/haeuser/${hausId}`)
      } catch (revalidateError) {
        console.warn('Failed to revalidate paths:', revalidateError)
        // Don't fail the operation for revalidation errors
      }
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
    
    // Determine specific error type
    let errorCode: (typeof ERROR_CODES)[keyof typeof ERROR_CODES] = ERROR_CODES.INTERNAL_ERROR
    let errorMessage = 'Failed to update apartments'
    
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        errorCode = ERROR_CODES.DATABASE_ERROR
        errorMessage = 'Database operation timed out'
      } else if (error.message.includes('connection')) {
        errorCode = ERROR_CODES.DATABASE_ERROR
        errorMessage = 'Database connection failed'
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        errors: [{ id: 'operation', message: errorMessage, code: errorCode }],
        updatedCount: 0,
        failedIds: selectedIds
      },
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
      { 
        success: false, 
        error: 'Type (ist_einnahmen) is required and must be boolean',
        errors: [{ id: 'ist_einnahmen', message: 'Type (ist_einnahmen) is required and must be boolean', code: ERROR_CODES.VALIDATION_FAILED }],
        updatedCount: 0,
        failedIds: selectedIds
      },
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
      console.error('Database error validating finance entries:', finanzenError)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to validate finance entries',
          errors: [{ id: 'database', message: 'Failed to validate finance entries', code: ERROR_CODES.DATABASE_ERROR }],
          updatedCount: 0,
          failedIds: selectedIds
        },
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
        code: ERROR_CODES.NOT_FOUND
      })
      failedIds.push(id)
    })

    // Update valid Finanzen entries in batches
    if (validFinanzenIds.length > 0) {
      const batchSize = 100 // Process in batches of 100
      const batches = []
      
      for (let i = 0; i < validFinanzenIds.length; i += batchSize) {
        batches.push(validFinanzenIds.slice(i, i + batchSize))
      }
      
      let batchUpdatedCount = 0
      
      for (const batch of batches) {
        try {
          const { error: updateError, count } = await supabase
            .from('Finanzen')
            .update({ ist_einnahmen: istEinnahmen })
            .in('id', batch)
            .eq('user_id', userId)

          if (updateError) {
            console.error('Error updating Finanzen batch:', updateError)
            
            // Mark this batch as failed
            batch.forEach((id: string) => {
              errors.push({
                id,
                message: 'Failed to update finance entry',
                code: ERROR_CODES.UPDATE_FAILED
              })
              failedIds.push(id)
            })
          } else {
            batchUpdatedCount += count || batch.length
          }
        } catch (batchError) {
          console.error('Batch update error:', batchError)
          
          // Mark this batch as failed
          batch.forEach((id: string) => {
            errors.push({
              id,
              message: 'Database error during update',
              code: ERROR_CODES.DATABASE_ERROR
            })
            failedIds.push(id)
          })
        }
      }
      
      updatedCount = batchUpdatedCount
    }

    // Revalidate relevant paths
    if (updatedCount > 0) {
      try {
        revalidatePath('/finanzen')
        revalidatePath('/')
      } catch (revalidateError) {
        console.warn('Failed to revalidate paths:', revalidateError)
        // Don't fail the operation for revalidation errors
      }
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
    
    // Determine specific error type
    let errorCode: (typeof ERROR_CODES)[keyof typeof ERROR_CODES] = ERROR_CODES.INTERNAL_ERROR
    let errorMessage = 'Failed to update finance entries'
    
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        errorCode = ERROR_CODES.DATABASE_ERROR
        errorMessage = 'Database operation timed out'
      } else if (error.message.includes('connection')) {
        errorCode = ERROR_CODES.DATABASE_ERROR
        errorMessage = 'Database connection failed'
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        errors: [{ id: 'operation', message: errorMessage, code: errorCode }],
        updatedCount: 0,
        failedIds: selectedIds
      },
      { status: 500 }
    )
  }
}