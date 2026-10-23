type P = { size?: number };

const base = (size = 20) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const IconDisc = ({ size }: P) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="3" />
    <path d="M12 12h.01" />
  </svg>
);

export const IconHeart = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
  </svg>
);

export const IconPlus = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconDeck = ({ size }: P) => (
  <svg {...base(size)}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <circle cx="10" cy="12" r="4.5" />
    <path d="M17.5 7.5v6l-2.5 2.5" />
  </svg>
);

export const IconChart = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M5 20V10M12 20V4M19 20v-7" />
  </svg>
);

export const IconGear = ({ size }: P) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
  </svg>
);

export const IconStar = ({ size, filled }: P & { filled?: boolean }) => (
  <svg {...base(size)} fill={filled ? "currentColor" : "none"}>
    <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9L12 3.5Z" />
  </svg>
);

export const IconSearch = ({ size }: P) => (
  <svg {...base(size)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

export const IconCamera = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
    <circle cx="12" cy="13.5" r="3.5" />
  </svg>
);

export const IconBarcode = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M4 6v12M7 6v12M11 6v12M14 6v12M18 6v12M20 6v12" />
  </svg>
);

export const IconBack = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="m15 18-6-6 6-6" />
  </svg>
);

export const IconClose = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const IconSun = ({ size }: P) => (
  <svg {...base(size)}>
    <rect x="4" y="4" width="16" height="16" rx="1.5" />
    <path d="M8 16l3-4 2 2.5 1.5-2L17 16" />
  </svg>
);

export const IconMoon = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
  </svg>
);

export const IconSpotify = ({ size = 20 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="11" fill="currentColor" />
    <path
      d="M6.5 9.3c3.8-1.1 8-.8 11.3 1M7.2 12.5c3.1-.9 6.4-.6 9.1.9M7.9 15.5c2.5-.6 5-.4 7.1.8"
      stroke="#1ed760"
      strokeWidth="1.7"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

export const IconMove = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M5 9 2 12l3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20" />
  </svg>
);
