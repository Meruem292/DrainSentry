import * as React from "react"

const Logo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 120 28" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <text
      x="-2"
      y="22"
      fontFamily="'PT Sans', sans-serif"
      fontSize="24"
      fontWeight="bold"
      fill="hsl(var(--primary))"
    >
      Drain
    </text>
    <text
      x="58"
      y="22"
      fontFamily="'PT Sans', sans-serif"
      fontSize="24"
      fontWeight="bold"
      fill="hsl(var(--accent))"
    >
      Sentry
    </text>
  </svg>
)

export default Logo;