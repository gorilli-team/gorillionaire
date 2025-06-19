import type { Metadata } from "next";
import "@coinbase/onchainkit/styles.css";
import "./styles/globals.css";
import { Providers } from "./providers";
import Script from "next/script";

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
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 text-center font-medium relative overflow-hidden">
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="relative z-10 flex items-center justify-center gap-3">
            <svg
              viewBox="0 -28.5 256 256"
              className="w-5 h-5"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M216.856339,16.5966031 C200.285002,8.84328665 182.566144,3.2084988 164.041564,0 C161.766523,4.11318106 159.108624,9.64549908 157.276099,14.0464379 C137.583995,11.0849896 118.072967,11.0849896 98.7430163,14.0464379 C96.9108417,9.64549908 94.1925838,4.11318106 91.8971895,0 C73.3526068,3.2084988 55.6133949,8.86399117 39.0420583,16.6376612 C5.61752293,67.146514 -3.4433191,116.400813 1.08711069,164.955721 C23.2560196,181.510915 44.7403634,191.567697 65.8621325,198.148576 C71.0772151,190.971126 75.7283628,183.341335 79.7352139,175.300261 C72.104019,172.400575 64.7949724,168.822202 57.8887866,164.667963 C59.7209612,163.310589 61.5131304,161.891452 63.2445898,160.431257 C105.36741,180.133187 151.134928,180.133187 192.754523,160.431257 C194.506336,161.891452 196.298154,163.310589 198.110326,164.667963 C191.183787,168.842556 183.854737,172.420929 176.223542,175.320965 C180.230393,183.341335 184.861538,190.991831 190.096624,198.16893 C211.238746,191.588051 232.743023,181.531619 254.911949,164.955721 C260.227747,108.668201 245.831087,59.8662432 216.856339,16.5966031 Z M85.4738752,135.09489 C72.8290281,135.09489 62.4592217,123.290155 62.4592217,108.914901 C62.4592217,94.5396472 72.607595,82.7145587 85.4738752,82.7145587 C98.3405064,82.7145587 108.709962,94.5189427 108.488529,108.914901 C108.508531,123.290155 98.3405064,135.09489 85.4738752,135.09489 Z M170.525237,135.09489 C157.88039,135.09489 147.510584,123.290155 147.510584,108.914901 C147.510584,94.5396472 157.658606,82.7145587 170.525237,82.7145587 C183.391518,82.7145587 193.761324,94.5189427 193.539891,108.914901 C193.539891,123.290155 183.391518,135.09489 170.525237,135.09489 Z"
                fill="white"
                fillRule="nonzero"
              />
            </svg>
            <span>
              <span className="font-bold">Join our Discord</span> and{" "}
              <span className="font-bold text-yellow-300">get alpha</span>
            </span>
            <a
              href="https://discord.gg/yYtgzHywRF"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-indigo-600 px-4 py-1.5 rounded-md font-bold text-sm hover:bg-gray-100 transition-colors duration-200 shadow-lg"
            >
              Join Now
            </a>
          </div>
        </div>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
