const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const siteConfig = {
  name: "GroupBus",
  description: "Coach & Bus Rental Marketplace",
  url: appUrl,
  ogImage: "/og.png",
  links: {
    website: appUrl,
  },
  support: {
    email: `support@${new URL(appUrl).hostname.replace(/^www\./, "")}`,
    phone: "0800 123 4567",
  },
} as const;
