/**
 * @jest-environment node
 */

import { readdirSync, readFileSync, statSync } from 'fs'
import { join, relative, sep } from 'path'

// `revalidatePath` with a path that is not a route is a silent no-op. This happened with
// '/dashboard/betriebskosten' (the dashboard group has no 'dashboard' prefix), so every string-literal
// target must resolve to an existing page of the app.

const ROOT = process.cwd()
const SOURCE_DIRS = ['app', 'lib']
const PAGE_FILE = /^page\.(tsx|ts|jsx|js)$/
const SOURCE_FILE = /\.(tsx|ts)$/
const TEST_FILE = /\.(test|spec)\.(tsx|ts)$/

function walk(dir: string, visit: (file: string) => void) {
    for (const entry of readdirSync(dir)) {
        if (entry === 'node_modules' || entry === '.next') continue
        const full = join(dir, entry)
        if (statSync(full).isDirectory()) walk(full, visit)
        else visit(full)
    }
}

// Route groups '(name)' and parallel slots '@name' do not appear in the URL
function routeOf(pageFile: string) {
    const segments = relative(join(ROOT, 'app'), join(pageFile, '..'))
        .split(sep)
        .filter((segment) => segment && !segment.startsWith('(') && !segment.startsWith('@'))
    return '/' + segments.join('/')
}

describe('revalidatePath targets', () => {
    it('only use string-literal paths that are existing pages', () => {
        const routes = new Set<string>()
        walk(join(ROOT, 'app'), (file) => {
            if (PAGE_FILE.test(file.split(sep).pop() ?? '')) routes.add(routeOf(file))
        })

        const pattern = /revalidatePath\(\s*(['"])(\/[^'"`$]*)\1/g
        const dead: string[] = []
        for (const dir of SOURCE_DIRS) {
            walk(join(ROOT, dir), (file) => {
                if (!SOURCE_FILE.test(file) || TEST_FILE.test(file)) return
                const source = readFileSync(file, 'utf8')
                for (const match of source.matchAll(pattern)) {
                    if (!routes.has(match[2])) dead.push(`${relative(ROOT, file)}: ${match[2]}`)
                }
            })
        }

        expect(routes.has('/dashboard')).toBe(true)
        expect(dead).toEqual([])
    })
})
