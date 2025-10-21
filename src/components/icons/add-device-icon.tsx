
import { SVGProps } from 'react';

const AddDeviceIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect width="18" height="18" x="3" y="3" rx="2" stroke="hsl(var(--accent))" fill="hsl(var(--accent) / 0.1)" />
    <line x1="12" x2="12" y1="8" y2="16" stroke="hsl(var(--accent))" />
    <line x1="8" x2="16" y1="12" y2="12" stroke="hsl(var(--accent))" />
  </svg>
);

export default AddDeviceIcon;
