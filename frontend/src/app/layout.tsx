import type { Metadata } from "next";
import "@coinbase/onchainkit/styles.css";
import "./styles/globals.css";
import { Providers } from "./providers";
import Script from "next/script";
import ReferralBanner from "./components/ReferralBanner";

//Import Mixpanel SDK
import mixpanel from "mixpanel-browser";

if (
  process.env.NEXT_PUBLIC_MIXPANEL_TOKEN &&
  process.env.NODE_ENV === "production"
) {
  // Near entry of your product, init Mixpanel
  mixpanel.init(process.env.NEXT_PUBLIC_MIXPANEL_TOKEN, {
    debug: true,
    track_pageview: true,
    persistence: "localStorage",
  });
}

export const metadata: Metadata = {
  title: "Gorillionaire – AI-Powered Crypto Signals & Gamified Trading",
  description:
    "Stay ahead in the crypto market with AI-driven trading signals. Receive real-time BUY/SELL alerts, trade seamlessly using 0x Swap API, and climb the leaderboard in a gamified trading experience. Built for speed and efficiency on Monad.",
  icons: {
    icon: "fav.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.1/css/all.min.css"
          integrity="sha512-5Hs3dF2AEPkpNAR7UiOHba+lRSJNeM2ECkwxUIxC1Q/FLycGTbNapWXB4tP889k5T5Ju8fs4b1P5z/iB4nMfSQ=="
          crossOrigin="anonymous"
        />
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
          crossOrigin="anonymous"
        />
        <Script
          src="https://s3.tradingview.com/tv.js"
          strategy="beforeInteractive"
          type="text/javascript"
        />
        <Script
          defer
          src="https://cloud.umami.is/script.js"
          data-website-id="1ac7b906-684c-46cb-95d7-f7719fb51940"
        />
      </head>
      <body suppressHydrationWarning>
        <Providers>
          <ReferralBanner />
          {children}
        </Providers>
      </body>
    </html>
  );
}
