import React from "react";
import { useAccount } from "wagmi";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface SidebarProps {
  selectedPage: string;
  setSelectedPage: React.Dispatch<React.SetStateAction<string>>;
}

export default function Sidebar({
  selectedPage,
  setSelectedPage,
}: SidebarProps) {
  const { address } = useAccount();
  const router = useRouter();

  const handleGorillionaireClick = () => {
    router.push("/");
  };

  const handlePageChange = (page: string) => {
    setSelectedPage(page);
    router.push(`/${page.toLowerCase()}`);
  };

  return (
    <aside className="w-64 text-gray-800 flex flex-col border border-gray-300">
      <div
        className="h-16 text-xl font-bold flex items-center ps-4 cursor-pointer"
        onClick={handleGorillionaireClick}
      >
        <Image
          src="/gorillionaire.jpg"
          alt="logo-gorillionaire"
          width={48}
          height={48}
          className="rounded-full"
        />
        <span className="ps-2">Gorillionaire</span>
      </div>
      <nav className="flex-1 p-4">
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
              <i className="fa-regular fa-newspaper pr-2"></i>
              <span>Tokens</span>
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

          {address && (
            <>
              <li>
                <button
                  className={`w-full text-left px-3 py-2 rounded-lg hover:bg-gray-200 ${
                    selectedPage === "TestTrading" ? "bg-gray-200" : ""
                  }`}
                  onClick={() => handlePageChange("TestTrading")}
                >
                  <i className="fa-solid fa-chart-line pr-2"></i>
                  <span>Test trading</span>
                </button>
              </li>
              <li>
                <button
                  className={`w-full text-left px-3 py-2 rounded-lg hover:bg-gray-200 ${
                    selectedPage === "My Account" ? "bg-gray-200" : ""
                  }`}
                  onClick={() => handlePageChange("My Account")}
                >
                  <i className="fa-solid fa-circle-user pr-2"></i>
                  <span>My account</span>
                </button>
              </li>
            </>
          )}
        </ul>
      </nav>
    </aside>
  );
}
