import { SVGProps } from 'react';

const WasteBinIcon = (props: SVGProps<SVGSVGElement>) => (
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
        @keyframes lid-lift {
          0%, 100% { transform: rotate(0deg); transform-origin: 19px 5px; }
          50% { transform: rotate(-25deg); transform-origin: 19px 5px; }
        }
        .lid-path {
          animation: lid-lift 2.5s ease-in-out infinite;
          stroke: hsl(var(--accent));
          fill: hsl(var(--accent) / 0.1);
        }
        .bin-body {
            stroke: hsl(var(--primary));
             fill: hsl(var(--primary) / 0.1);
        }
        .bin-lines {
            stroke: hsl(var(--primary));
        }
      `}
    </style>
    <path className="bin-body" d="M3 6h18" />
    <path className="bin-body" d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <path className="lid-path" d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line className="bin-lines" x1="10" x2="10" y1="11" y2="17" />
    <line className="bin-lines" x1="14" x2="14" y1="11" y2="17" />
  </svg>
);

export default WasteBinIcon;
