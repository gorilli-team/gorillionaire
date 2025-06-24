import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";

interface SidebarProps {
  selectedPage: string;
  setSelectedPage: React.Dispatch<React.SetStateAction<string>>;
}

export default function Sidebar({
  selectedPage,
  setSelectedPage,
}: SidebarProps) {
  const router = useRouter();
  const { user } = usePrivy();
  const address = user?.wallet?.address;

  const handleGorillionaireClick = () => {
    window.location.reload();
  };

  const handlePageChange = (page: string) => {
    setSelectedPage(page);
    if (page === "Profile") {
      router.push(`/users/${address}`);
    } else if (page === "Weekly Leaderboard") {
      router.push(`/leaderboard/weekly`);
    } else {
      router.push(`/${page.toLowerCase()}`);
    }
  };

  return (
    <aside className="w-64 text-gray-800 flex flex-col bg-white h-screen sticky top-0 border-r border-gray-200 overflow-y-auto">
      <div
        className="h-16 text-xl font-bold flex items-center ps-6 lg:ps-6 cursor-pointer"
        onClick={handleGorillionaireClick}
      >
        <Image
          src="/logolight.svg"
          alt="logo-gorillionaire"
          width={180}
          height={180}
          className="rounded-full ml-[40px] lg:ml-0" // Added 40px margin left only on mobile
        />
      </div>
      <nav className="flex-1 p-4 overflow-hidden">
        <ul className="space-y-2">
          <li>
            <button
              className={`w-full text-left px-3 py-2 rounded-lg hover:bg-gray-200 ${
                selectedPage === "Signals" ? "bg-gray-200" : ""
              }`}
              onClick={() => handlePageChange("Signals")}
            >
              <i className="fa-solid fa-signal pr-2"></i>
              <span>Signals</span>
            </button>
          </li>
          <li>
            <button
              className={`w-full text-left px-3 py-2 rounded-lg hover:bg-gray-200 ${
                selectedPage === "Tokens" ? "bg-gray-200" : ""
              }`}
              onClick={() => handlePageChange("Tokens")}
            >
              <i className="fa-solid fa-coins pr-2"></i>
              <span>Tokens</span>
            </button>
          </li>
          {address && (
            <li>
              <button
                className={`w-full text-left px-3 py-2 rounded-lg hover:bg-gray-200 ${
                  selectedPage === "Profile" ? "bg-gray-200" : ""
                }`}
                onClick={() => handlePageChange("Profile")}
              >
                <i className="fa-solid fa-user pr-2"></i>
                <span>Profile</span>
              </button>
            </li>
          )}
          <li>
            <button
              className={`w-full text-left px-3 py-2 rounded-lg hover:bg-gray-200 ${
                selectedPage === "Leaderboard" ? "bg-gray-200" : ""
              }`}
              onClick={() => handlePageChange("Leaderboard")}
            >
              <i className="fa-solid fa-star pr-2"></i>
              <span>Leaderboard</span>
            </button>
          </li>
          <li>
            <button
              className={`w-full text-left px-3 py-2 rounded-lg hover:bg-gray-200 ${
                selectedPage === "Weekly Leaderboard" ? "bg-gray-200" : ""
              }`}
              onClick={() => handlePageChange("Weekly Leaderboard")}
            >
              <i className="fa-solid fa-calendar-week pr-2"></i>
              <span>Weekly Leaderboard</span>
            </button>
          </li>
          <li>
            <button
              className={`w-full text-left px-3 py-2 rounded-lg hover:bg-gray-200 ${
                selectedPage === "Agents" ? "bg-gray-200" : ""
              }`}
              onClick={() => handlePageChange("Agents")}
            >
              <i className="fa-solid fa-robot pr-2"></i>
              <span>Agents</span>
            </button>
          </li>
          <li>
            <button
              className={`w-full text-left px-3 py-2 rounded-lg hover:bg-gray-200 ${
                selectedPage === "V2" ? "bg-gray-200" : ""
              }`}
              onClick={() => handlePageChange("V2")}
            >
              <i className="fa-solid fa-rocket pr-2"></i>
              <span>V2 🦍</span>
            </button>
          </li>
          <li></li>
        </ul>
        <a
          href="https://t.me/monadsignals"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors w-[220px]"
          aria-label="Join our Telegram Channel for Real-time Trading Events"
        >
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.015-.15-.056-.212s-.041-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.241-1.865-.44-.751-.244-1.349-.374-1.297-.789.027-.216.324-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.015 3.333-1.386 4.025-1.627 4.477-1.635.099-.002.321.023.465.141.119.098.152.228.166.331.016.122.037.384.021.591z" />
          </svg>
          <div className="flex flex-col items-start text-sm">
            <span className="font-medium">Join Telegram Channel</span>
            <span className="text-xs opacity-90">Real-time Trading Events</span>
          </div>
        </a>
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4 mb-16">
        <ul className="space-y-2">
          <li>
            <a
              href="https://github.com/gorilli-team/gorillionaire"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-200 flex items-center"
            >
              <Image
                src="/github.svg"
                alt="github_icon"
                width={28}
                height={28}
                className="pr-2"
              />
              <span>GitHub</span>
            </a>
          </li>

          <li>
            <a
              href="https://x.com/gorillionaireAI"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-200 flex items-center"
            >
              <Image
                src="/twitter.svg"
                alt="twitter_icon"
                width={28}
                height={28}
                className="pr-2"
              />
              <span>X / Twitter</span>
            </a>
          </li>
        </ul>
        <div className="flex items-center pl-3 mt-4 text-xs text-gray-500">
          <span className="mr-2">Powered by</span>
          <Image src="/Vector.svg" alt="Gorilli" width={70} height={70} />
        </div>
      </div>
    </aside>
  );
}
