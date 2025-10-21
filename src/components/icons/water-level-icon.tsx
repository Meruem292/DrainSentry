import { SVGProps } from 'react';

const WaterLevelIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <style>
      {`
        @keyframes wave {
          0% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
          100% { transform: translateY(0); }
        }
        .wave-path {
          animation: wave 2s ease-in-out infinite;
          stroke: hsl(var(--primary-foreground));
        }
        .droplet-path {
            fill: hsl(var(--primary));
            stroke: hsl(var(--primary));
        }
      `}
    </style>
    <path className="droplet-path" d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0L12 2.69z" />
    <path className="wave-path" d="M8 12.5c.5-1 1.5-2 3-2s2.5 1 3 2" style={{animationDelay: '0s'}}/>
    <path className="wave-path" d="M8 15.5c.5-1 1.5-2 3-2s2.5 1 3 2" style={{animationDelay: '0.5s'}}/>
  </svg>
);

export default WaterLevelIcon;
