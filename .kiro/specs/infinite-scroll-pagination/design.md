# Design Document

## Overview

This design document outlines the implementation of infinite scroll functionality with server-side pagination for the finance transactions table in the RMS application. The solution will automatically load more data as users scroll down while maintaining accurate totals and filtering capabilities. The system will load 25 transactions initially (15 on mobile) and fetch additional batches as needed, providing a modern user experience for managing large financial datasets.

The design follows a dual-endpoint approach: one for paginated transaction data and another for totals calculation, ensuring that financial summaries always reflect the complete filtered dataset regardless of pagination state.

## Architecture

### System Components

The infinite scroll implementation consists of several key architectural components:

1. **Server-Side API Layer**: Enhanced API routes with pagination and totals endpoints
2. **Client-Side State Management**: React hooks managing pagination, filters, and loading states
3. **Intersection Observer**: Browser API for detecting scroll position and triggering loads
4. **Data Flow Coordination**: Orchestrating between paginated data and totals calculation

### Data Flow Architecture

```
User Action (Filter/Scroll) 
    ↓
State Management (React Hooks)
    ↓
API Calls (Parallel: Data + Totals)
    ↓
Database Queries (Paginated + Aggregated)
    ↓
Response Processing
    ↓
UI Update (Append Data + Update Totals)
```

### API Endpoint Design

The system will use two primary endpoints:

1. **Paginated Data Endpoint**: `GET /api/finanzen?offset=0&limit=25&apartment=...&year=...&type=...&search=...`
2. **Totals Endpoint**: `GET /api/finanzen/totals?apartment=...&year=...&type=...&search=...`

This separation ensures totals are calculated from the complete dataset while pagination handles data loading efficiently.

## Components and Interfaces

### API Response Interfaces

```typescript
// Paginated transactions response
interface PaginatedFinanceResponse {
  data: Finanz[]
  pagination: {
    offset: number
    limit: number
    total: number
    hasMore: boolean
  }
}

// Totals response
interface FinanceTotalsResponse {
  totalBalance: number
  totalIncome: number
  totalExpenses: number
  transactionCount: number
}

// Filter parameters interface
interface FinanceFilters {
  apartment?: string
  year?: string
  type?: 'income' | 'expense'
  search?: string
}
```

### Client State Management

```typescript
// Pagination state
interface PaginationState {
  currentOffset: number
  limit: number
  hasMore: boolean
  isLoading: boolean
  isLoadingMore: boolean
  totalCount: number
}

// Main component state
interface FinanceTableState {
  transactions: Finanz[]
  pagination: PaginationState
  filters: FinanceFilters
  totals: FinanceTotalsResponse
  error: string | null
}
```

### Intersection Observer Configuration

```typescript
interface InfiniteScrollConfig {
  rootMargin: '200px'  // Trigger 200px before bottom
  threshold: 0.1       // 10% visibility threshold
  enabled: boolean     // Can be disabled during loading
}
```

## Data Models

### Database Query Optimization

The implementation will require optimized database queries for both paginated data and totals:

**Paginated Query Structure:**
```sql
SELECT f.*, w.name as wohnung_name 
FROM finanzen f 
LEFT JOIN wohnungen w ON f.wohnung_id = w.id 
WHERE [filter_conditions]
ORDER BY f.datum DESC 
LIMIT 25 OFFSET 0
```

**Totals Query Structure:**
```sql
SELECT 
  SUM(CASE WHEN ist_einnahmen THEN betrag ELSE -betrag END) as total_balance,
  SUM(CASE WHEN ist_einnahmen THEN betrag ELSE 0 END) as total_income,
  SUM(CASE WHEN NOT ist_einnahmen THEN betrag ELSE 0 END) as total_expenses,
  COUNT(*) as transaction_count
FROM finanzen f 
LEFT JOIN wohnungen w ON f.wohnung_id = w.id 
WHERE [same_filter_conditions]
```

### Filter Integration

All filters will be applied consistently across both paginated data and totals queries:

- **Apartment Filter**: `f.wohnung_id = ?`
- **Year Filter**: `EXTRACT(YEAR FROM f.datum) = ?`
- **Type Filter**: `f.ist_einnahmen = ?`
- **Search Filter**: `(f.name ILIKE ? OR w.name ILIKE ? OR f.notizen ILIKE ?)`

## Error Handling

### Network Error Recovery

The system implements a comprehensive error handling strategy:

1. **Exponential Backoff**: Failed requests retry with increasing delays (1s, 2s, 4s)
2. **Partial Load Handling**: Display successfully loaded data even if some requests fail
3. **User-Friendly Messages**: Clear error communication with retry options
4. **Offline Detection**: Handle network connectivity issues gracefully

### Error State Management

```typescript
interface ErrorState {
  type: 'network' | 'server' | 'timeout' | 'unknown'
  message: string
  retryCount: number
  canRetry: boolean
}
```

## Testing Strategy

### Unit Testing Approach

1. **API Endpoint Tests**
   - Pagination parameter validation
   - Filter query construction
   - Response format verification
   - Error handling scenarios

2. **Client State Management Tests**
   - Pagination state updates
   - Filter state synchronization
   - Loading state transitions
   - Error state handling

3. **Intersection Observer Tests**
   - Scroll detection accuracy
   - Loading trigger timing
   - Cleanup on component unmount
   - Mobile vs desktop behavior

### Integration Testing

1. **End-to-End Scroll Behavior**
   - Complete infinite scroll flow
   - Filter + scroll interactions
   - Mobile device testing
   - Performance under load

2. **Data Consistency Tests**
   - Totals accuracy with filters
   - Pagination data integrity
   - Concurrent request handling
   - Cache invalidation scenarios

### Performance Testing

1. **Load Testing Metrics**
   - Initial load time < 500ms
   - Infinite scroll trigger < 200ms
   - Filter change response < 300ms
   - Smooth 60fps scrolling

2. **Memory Management**
   - Large dataset handling (1000+ records)
   - Memory usage during scroll operations
   - Cleanup of unused data
   - Mobile device optimization

## Implementation Details

### Server-Side Implementation

**API Route Modifications (`app/api/finanzen/route.ts`)**:
- Add pagination parameters (`offset`, `limit`)
- Implement filter parameter parsing
- Add database query optimization
- Create separate totals calculation logic

**New Totals Endpoint (`app/api/finanzen/totals/route.ts`)**:
- Dedicated endpoint for aggregated calculations
- Same filter logic as paginated endpoint
- Optimized for calculation performance
- Cached results where appropriate

### Client-Side Implementation

**State Management (`client-wrapper.tsx`)**:
- React hooks for pagination state
- Debounced search functionality (300ms)
- Filter state synchronization
- Loading state coordination

**Infinite Scroll Component (`components/finance-transactions.tsx`)**:
- Intersection Observer setup and cleanup
- Scroll position detection
- Loading trigger management
- Error handling and retry logic

**UI Components**:
- Skeleton loaders for initial load
- Bottom loading spinner for infinite scroll
- Progress indicators ("Showing X of Y")
- Error states with retry buttons

### Mobile Optimization

**Performance Adaptations**:
- Reduced batch size (15 vs 25 transactions)
- Touch-optimized scroll detection
- Efficient rendering for smaller screens
- Battery-conscious scroll monitoring

**Responsive Design**:
- Mobile-first loading indicators
- Touch gesture support
- Optimized image and data loading
- Reduced network requests

### Accessibility Implementation

**Screen Reader Support**:
- ARIA live regions for loading announcements
- Proper labeling of loading states
- Focus management during data loads
- Skip links for navigation

**Visual Accessibility**:
- High contrast loading indicators
- Clear visual feedback for all states
- Reduced motion support
- Keyboard navigation compatibility

## Security Considerations

### Data Access Control

- User-specific data filtering in database queries
- Proper authentication checks on all endpoints
- Rate limiting for API requests
- Input validation and sanitization

### Performance Security

- Query optimization to prevent database overload
- Request throttling to prevent abuse
- Memory usage monitoring
- Timeout handling for long-running queries

## Deployment Strategy

### Phased Implementation

1. **Phase 1**: Basic infinite scroll without filters
2. **Phase 2**: Filter integration and totals calculation
3. **Phase 3**: Performance optimizations and error handling
4. **Phase 4**: Mobile optimization and accessibility
5. **Phase 5**: Advanced features and monitoring

### Monitoring and Analytics

- Performance metrics tracking
- Error rate monitoring
- User interaction analytics
- Database query performance
- Mobile vs desktop usage patterns

This design provides a comprehensive foundation for implementing infinite scroll with server-side pagination while maintaining data accuracy and providing an excellent user experience across all devices and accessibility requirements.