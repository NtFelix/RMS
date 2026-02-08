---
name: nextjs-15-best-practices
description: Best practices for Next.js 15, React 19, and the App Router.
metadata:
  version: 1.0.0
---

# Next.js 15 & React 19 Best Practices

You're a Next.js 15 and React 19 expert. Follow these guidelines for high-performance, modern web applications.

## Guidelines

1. **Caching Defaults**: Next.js 15 has changed the default of `fetch` requests from `force-cache` to `no-store`. Explicitly define caching behavior if you want persistent data:
   ```typescript
   fetch('...', { cache: 'force-cache' }) // For static data
   ```
2. **React 19 Actions**: Use React 19 `useActionState` (formerly `useFormState`) and `useFormStatus` for managing form state and pending transitions.
3. **The `use` Hook**: Use the new `use` hook to read resources like Promises and Context in render:
   ```typescript
   const data = use(dataPromise);
   ```
4. **Metadata & SEO**: Use the `Metadata` API in Server Components. Avoid using the old `Head` component.
5. **Partial Prerendering (PPR)**: If enabled, utilize PPR to wrap dynamic components in `Suspense` for faster initial loads while keeping dynamic parts reactive.
6. **Server Actions**: Always mark server-side logic intended for the client with `'use server'`. Ensure they are secure and validate all inputs with a library like `Zod`.
7. **Client Components**: Keep Client Components as small as possible and at the leaf of the component tree.
8. **Hydration Errors**: Avoid accessing `window` or `document` directly in the render path of a Client Component without a `useEffect` or checking for `undefined`.

## Example: Next.js 15 Form with Server Action

```tsx
'use client'

import { useActionState } from 'react'
import { submitForm } from './actions'

export function MyForm() {
  const [state, action, isPending] = useActionState(submitForm, null)

  return (
    <form action={action}>
      <input name="email" type="email" required />
      <button disabled={isPending}>
        {isPending ? 'Submitting...' : 'Submit'}
      </button>
      {state?.error && <p>{state.error}</p>}
    </form>
  )
}
```

### Example: Using useFormStatus (Alternative Pattern)

```tsx
'use client'

import { useFormStatus } from 'react-dom'
import { submitForm } from './actions'

function SubmitButton() {
  const { pending } = useFormStatus()
  
  return (
    <button disabled={pending}>
      {pending ? 'Submitting...' : 'Submit'}
    </button>
  )
}

export function MyForm() {
  return (
    <form action={submitForm}>
      <input name="email" type="email" required />
      <SubmitButton />
    </form>
  )
}
```

## Example: Server Action with Validation

```typescript
'use server'

import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
})

export async function submitForm(prevState: any, formData: FormData) {
  const validated = schema.safeParse({
    email: formData.get('email'),
  })

  if (!validated.success) {
    return { error: 'Invalid email' }
  }

  // Process data...
  return { success: true }
}
```
