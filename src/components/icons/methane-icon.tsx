import { SVGProps } from 'react';

const MethaneIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <style>
      {`
        @keyframes pulse-cloud {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.05); opacity: 1; }
        }
        .pulse-path {
          animation: pulse-cloud 3s ease-in-out infinite;
          fill: hsl(var(--accent) / 0.5);
          stroke: hsl(var(--accent));
        }
      `}
    </style>
    <path className="pulse-path" d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
  </svg>
);

export default MethaneIcon;
