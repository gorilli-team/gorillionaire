import React, { useEffect, useState } from "react";
import { Pagination } from "flowbite-react";
import { Time } from "lightweight-charts";

import Token from "../token/index";
import PriceChart from "../price-chart";
import {
  trackedTokens,
  fetchUntrackedTokens,
  TokenData,
  fetchAllTokens,
} from "@/app/shared/tokenData";
import { useRouter } from "next/navigation";
import { getTimeAgo } from "@/app/utils/time";

interface TokenStats {
  name: string;
  symbol: string;
  address: string;
  totalEvents: number;
  trackedSince: string;
  trackingTime: string;
}

interface PriceData {
  time: Time;
  value: number;
}

interface UntrackedToken {
  tokenName: string;
  tokenAddress: string;
  tokenSymbol: string;
  blockTimestamp: string;
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

const Tokens = () => {
  const router = useRouter();
  const [tokenStats, setTokenStats] = useState<TokenStats[]>([]);
  const [selectedToken, setSelectedToken] = useState<TokenData | null>(null);
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [untrackedTokens, setUntrackedTokens] = useState<UntrackedToken[]>([]);
  const [paginationData, setPaginationData] = useState<PaginationData>({
    total: 0,
    page: 1,
    limit: 25,
    pages: 1,
  });

  const onPageChange = async (page: number) => {
    await getUntrackedTokens(page);
  };

  const getUntrackedTokens = async (page: number = 1) => {
    try {
      const fetchedUntrackedTokens = await fetchUntrackedTokens(page);
      setUntrackedTokens(fetchedUntrackedTokens?.listings || []);
      setPaginationData(
        fetchedUntrackedTokens?.pagination || {
          total: 0,
          page: page,
          limit: 25,
          pages: 1,
        }
      );
    } catch (error) {
      console.error("Error fetching untracked tokens:", error);
      setUntrackedTokens([]);
      setPaginationData({
        total: 0,
        page: page,
        limit: 25,
        pages: 1,
      });
    }
  };

  useEffect(() => {
    const getTokens = async () => {
      try {
        const fetchedTokens = await fetchAllTokens();
        setTokenStats(fetchedTokens || []);
      } catch (error) {
        console.error("Error fetching tokens:", error);
        setTokenStats([]);
      }
    };

    getTokens();
  }, []);

  useEffect(() => {
    const fetchPriceData = async () => {
      if (!selectedToken) return;

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/events/prices?symbol=${selectedToken.symbol}`
        );
        const data = await response.json();

        if (data.success && data.data) {
          // Transform the data into the format expected by the chart
          const chartData = data.data.map(
            (item: { timestamp: string; price: number }) => {
              const date = new Date(item.timestamp);
              const timeValue = Math.floor(date.getTime() / 1000); // Convert to Unix timestamp (seconds)
              return {
                time: timeValue, // Use the timestamp directly which is compatible with Time type
                value: item.price,
              };
            }
          );

          // Sort by timestamp to ensure proper ordering
          chartData.sort(
            (a: PriceData, b: PriceData) =>
              (a.time as number) - (b.time as number)
          );

          setPriceData(chartData);
        }
      } catch (error) {
        console.error("Error fetching price data:", error);
      }
    };

    fetchPriceData();
  }, [selectedToken]);

  useEffect(() => {
    getUntrackedTokens(1);
  }, []);

  // Merge static data with dynamic stats
  const trackedTokensWithStats = trackedTokens.map((token) => {
    const stats = tokenStats.find((t) => t.name === token.name);
    return {
      ...token,
      signalsGenerated: stats?.totalEvents || 0,
      trackedSince: stats?.trackedSince || "",
      trackingTime: stats?.trackingTime || "",
    };
  });

  const handleTokenClick = (token: TokenData) => {
    setSelectedToken(token);
  };

  const navigateToTokenDetail = (address: string) => {
    router.push(`/tokens/${address}`);
  };

  const navigateToTestnetExplorer = (address: string) => {
    window.open(`https://testnet.monadexplorer.com/token/${address}`, "_blank");
  };

  const getTokenColor = (address: string) => {
    // Use the last 6 characters of the address as the color
    return `#${address.slice(-6)}`;
  };

  const formatBlockTimestamp = (timestamp: string) => {
    // Convert block timestamp (in seconds) to milliseconds and create ISO string
    return new Date(parseInt(timestamp) * 1000).toISOString();
  };

  // Remove client-side pagination logic as we're using server-side pagination
  const getEmptyRows = (
    items: UntrackedToken[],
    itemsPerPage: number
  ): null[] => {
    const currentItemCount = items.length;
    if (currentItemCount < itemsPerPage) {
      return Array(itemsPerPage - currentItemCount).fill(null);
    }
    return [];
  };

  const emptyRows = getEmptyRows(untrackedTokens, paginationData.limit);

  return (
    <div className="w-full min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="container mx-auto">
        <div className="flex flex-col mb-4">
          <h2 className="text-xl font-bold mb-3">Tracked Tokens</h2>
          <a
            href="https://t.me/monadsignals"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors w-[240px]"
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
              <span className="text-xs opacity-90">
                Get Real-time Trading Events
              </span>
            </div>
          </a>
        </div>

        {selectedToken && priceData.length > 0 && (
          <div className="mb-8">
            <PriceChart data={priceData} tokenSymbol={selectedToken.symbol} />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
          {trackedTokensWithStats.map((token: TokenData, index: number) => (
            <div
              key={index}
              className={`bg-white shadow-md rounded-lg cursor-pointer hover:shadow-lg transition-shadow duration-200 border shadow-md  ${
                selectedToken?.address === token.address
                  ? "ring-2 ring-blue-500"
                  : ""
              }`}
            >
              <div onClick={() => handleTokenClick(token)}>
                <Token
                  name={token.name}
                  symbol={token.symbol}
                  image={token.image}
                  trackedSince={token.trackedSince}
                  signalsGenerated={token.signalsGenerated}
                />
              </div>
              <div className="px-4 pb-4 flex justify-end items-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateToTokenDetail(token.address);
                  }}
                  className="text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-md font-medium flex items-center transition-colors"
                >
                  View Details
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 ml-1"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        <h2 className="text-xl font-bold mt-8 mb-4">New Tokens on Uniswap</h2>
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mt-4">
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {/* Desktop view */}
              <table className="w-full border-collapse hidden md:table">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="text-left text-xs text-gray-500 border-b">
                    <th className="pb-2 font-medium">TOKEN NAME</th>
                    <th className="pb-2 font-medium">ADDRESS</th>
                    <th className="pb-2 font-medium">LISTED SINCE</th>
                    <th className="pb-2 font-medium">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {untrackedTokens.map(
                    (token: UntrackedToken, index: number) => (
                      <tr
                        key={index}
                        className="border-b border-gray-100 text-sm"
                      >
                        <td className="py-4 h-12">
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden">
                              <div
                                className="w-full h-full bg-gray-300 rounded-full"
                                style={{
                                  backgroundColor: getTokenColor(
                                    token.tokenAddress
                                  ),
                                }}
                              ></div>
                            </div>
                            <span className="text-gray-700 font-medium">
                              {token.tokenName}
                            </span>
                            <span className="text-gray-500">
                              ({token.tokenSymbol})
                            </span>
                          </div>
                        </td>
                        <td className="py-4 h-12 text-gray-700 max-w-xs truncate">
                          {token.tokenAddress}
                        </td>
                        <td className="py-4 h-12">
                          {getTimeAgo(
                            formatBlockTimestamp(token.blockTimestamp)
                          )}
                        </td>
                        <td className="py-4 h-12">
                          <div className="flex space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigateToTestnetExplorer(token.tokenAddress);
                              }}
                              className="px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors flex items-center"
                            >
                              View Details
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-3.5 w-3.5 ml-1"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                  {/* Empty rows to maintain fixed height */}
                  {emptyRows.map((_, index) => (
                    <tr
                      key={`empty-${index}`}
                      className="border-b border-gray-100"
                    >
                      <td className="h-16"></td>
                      <td className="h-16"></td>
                      <td className="h-16"></td>
                      <td className="h-16"></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile view - Card style for small screens */}
              <div className="md:hidden space-y-4">
                {untrackedTokens.map((token: UntrackedToken, index: number) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden">
                        <div
                          className="w-full h-full bg-gray-300 rounded-full"
                          style={{
                            backgroundColor: getTokenColor(token.tokenAddress),
                          }}
                        ></div>
                      </div>
                      <div>
                        <span className="text-gray-700 font-medium block">
                          {token.tokenName}
                        </span>
                        <span className="text-gray-500 text-sm">
                          ({token.tokenSymbol})
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 font-medium mb-1">
                        ADDRESS
                      </div>
                      <div className="text-gray-700 text-sm break-all">
                        {token.tokenAddress}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 font-medium mb-1">
                        LISTED SINCE
                      </div>
                      <div className="text-gray-700 text-sm">
                        {getTimeAgo(formatBlockTimestamp(token.blockTimestamp))}
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigateToTestnetExplorer(token.tokenAddress);
                        }}
                        className="w-full px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors flex items-center justify-center"
                      >
                        View Details
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3.5 w-3.5 ml-1"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}

                {/* Empty items for mobile if needed */}
                {emptyRows.length > 0 && (
                  <div className="text-center text-gray-500 text-sm py-4">
                    No more tokens to display
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pagination - made more responsive */}
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between">
            <span className="text-sm text-gray-500 mb-4 sm:mb-0">
              <span className="font-normal">Showing</span>{" "}
              <span className="font-bold">
                {(paginationData.page - 1) * paginationData.limit + 1}-
                {Math.min(
                  paginationData.page * paginationData.limit,
                  paginationData.total
                )}
              </span>{" "}
              <span className="font-normal">of</span>{" "}
              <span className="font-bold">{paginationData.total}</span>
            </span>
            <div className="flex-grow flex justify-center">
              <Pagination
                currentPage={paginationData.page}
                totalPages={paginationData.pages}
                onPageChange={onPageChange}
                showIcons={true}
                layout="navigation"
              />
            </div>
            <div className="hidden sm:block sm:w-32"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tokens;
