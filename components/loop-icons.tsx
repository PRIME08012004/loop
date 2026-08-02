import type { SVGProps } from "react";

export type IconName =
  | "tag"
  | "cluster"
  | "chat"
  | "report"
  | "loop"
  | "sun"
  | "moon"
  | "grid"
  | "inbox"
  | "trend"
  | "settings"
  | "search"
  | "plus"
  | "logout"
  | "sparkle"
  | "lock";

interface IconProps {
  name: IconName;
  className?: string;
}

export function LoopIcon({ name, className = "w-5 h-5" }: IconProps) {
  const common: SVGProps<SVGSVGElement> = {
    className,
    fill: "none",
    viewBox: "0 0 24 24",
    stroke: "currentColor",
    strokeWidth: 1.6,
  };

  switch (name) {
    case "tag":
      return (
        <svg {...common}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 11.5V5a2 2 0 0 1 2-2h6.5L21 11.5a2 2 0 0 1 0 2.8l-6.7 6.7a2 2 0 0 1-2.8 0L3 11.5Z"
          />
          <circle cx="8" cy="8" r="1.4" />
        </svg>
      );
    case "cluster":
      return (
        <svg {...common}>
          <circle cx="7" cy="7" r="3" />
          <circle cx="17" cy="7" r="3" />
          <circle cx="12" cy="17" r="3" />
          <path strokeLinecap="round" d="M9.2 8.8 10.5 14.8M14.8 8.8 13.5 14.8" />
        </svg>
      );
    case "chat":
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 5h16v10H8l-4 4V5Z" />
          <path strokeLinecap="round" d="M8 9.5h8M8 12.5h5" />
        </svg>
      );
    case "report":
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 3h9l4 4v14H6V3Z" />
          <path strokeLinecap="round" d="M9 12h6M9 15.5h6M9 8.5h3" />
        </svg>
      );
    case "loop":
      return (
        <svg {...common}>
          <path strokeLinecap="round" d="M4 12a5 5 0 0 1 5-5h6M20 12a5 5 0 0 1-5 5H9" />
          <path strokeLinecap="round" strokeLinejoin="round" d="m12 4 3 3-3 3M12 20l-3-3 3-3" />
        </svg>
      );
    case "sun":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" />
          <path
            strokeLinecap="round"
            d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
          />
        </svg>
      );
    case "moon":
      return (
        <svg {...common}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"
          />
        </svg>
      );
    case "grid":
      return (
        <svg {...common}>
          <rect x="3.5" y="3.5" width="7" height="7" rx="1.2" />
          <rect x="13.5" y="3.5" width="7" height="7" rx="1.2" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="1.2" />
          <rect x="13.5" y="13.5" width="7" height="7" rx="1.2" />
        </svg>
      );
    case "inbox":
      return (
        <svg {...common}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 12h5l1.5 3h5L16 12h5M3 12l1.5-6.5A2 2 0 0 1 6.4 4h11.2a2 2 0 0 1 1.9 1.5L21 12M3 12v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6"
          />
        </svg>
      );
    case "trend":
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l5-5 4 4 8-9M20 7h-4M20 7v4" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="2.6" />
          <path
            strokeLinecap="round"
            d="M12 4v1.6M12 18.4V20M20 12h-1.6M5.6 12H4M17 7l-1.1 1.1M8.1 15.9 7 17M17 17l-1.1-1.1M8.1 8.1 7 7"
          />
        </svg>
      );
    case "search":
      return (
        <svg {...common}>
          <circle cx="10.5" cy="10.5" r="6" />
          <path strokeLinecap="round" d="M20 20l-4.5-4.5" />
        </svg>
      );
    case "plus":
      return (
        <svg {...common}>
          <path strokeLinecap="round" d="M12 5v14M5 12h14" />
        </svg>
      );
    case "logout":
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
        </svg>
      );
    case "sparkle":
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "lock":
      return (
        <svg {...common}>
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path strokeLinecap="round" d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      );
    default:
      return null;
  }
}
