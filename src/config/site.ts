export const siteConfig = {
  name: "GroupBus",
  description: "Coach & Bus Rental Marketplace",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ogImage: "/og.png",
  links: {
    website: "https://groupbus.co.uk",
  },
} as const;
