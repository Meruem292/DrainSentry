import * as React from "react"

const Logo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 160 28" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <text
      x="0"
      y="22"
      fontFamily="'PT Sans', sans-serif"
      fontSize="24"
      fontWeight="bold"
      fill="currentColor"
    >
      DrainSentry
    </text>
  </svg>
)

export default Logo;
