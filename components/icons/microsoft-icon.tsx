import type React from "react"

/**
 * Microsoft logo icon using the official Microsoft 4-square colored logo
 */
export const MicrosoftIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
        {...props}
        viewBox="0 0 21 21"
        xmlns="http://www.w3.org/2000/svg"
    >
        {/* Red square - top left */}
        <rect x="1" y="1" width="9" height="9" fill="#f25022" />
        {/* Green square - top right */}
        <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
        {/* Blue square - bottom left */}
        <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
        {/* Yellow square - bottom right */}
        <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
)
