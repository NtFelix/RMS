declare module 'jest-axe' {
    import { AxeResults } from 'axe-core';

    export const axe: (html: string | HTMLElement, options?: any) => Promise<AxeResults>;
    export const toHaveNoViolations: {
        (results: AxeResults): any;
    };
}

declare global {
    namespace jest {
        interface Matchers<R> {
            toHaveNoViolations(): R;
        }
    }
}

export { };
