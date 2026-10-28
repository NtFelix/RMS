/**
 * @jest-environment node
 */

import { readFileSync } from 'fs'
import { join } from 'path'

// `next build` only validates the static shell of routes that are not covered by an
// `instant = false` opt-out. An opt-out on the root layout covers every route and silently
// switches that validation off app-wide, so it must not come back unnoticed.
describe('root layout', () => {
    it('does not opt out of instant validation for the whole app', () => {
        const source = readFileSync(join(process.cwd(), 'app', 'layout.tsx'), 'utf8')

        expect(source).not.toMatch(/export\s+const\s+instant\s*=/)
    })
})
