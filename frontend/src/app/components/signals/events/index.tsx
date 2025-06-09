import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/app/services/api";
import { ENDPOINTS } from "@/app/const/Endpoints";
import { useSSE } from "@/app/hooks/useSSE";
import { getTimeAgo } from "@/app/utils/time";
import { useRouter } from "next/navigation";

type Event = {
  id: string;
  token_id: string;
  signal_id: string;
  signal_name: string;
  currency: string;
  action: string;
  symbol: string;
  price: number;
  timestamp: string;
};

type Signal = {
  id: string;
  name: string;
  timeframe: string;
  description: string;
};

const EventSignalsComponent = () => {
  const router = useRouter();
  const [signals, setSignals] = useState<Map<string, Signal>>(new Map());
  const [events, setEvents] = useState<Event[]>([]);

  const handleEvent = useCallback((data: Event) => {
    setEvents((prev) => [data, ...prev].slice(0, 50)); // Keep last 50 signals
  }, []);

  const navigateToSignalDetail = (id: string) => {
    router.push(`/v2/signals/${id}`);
  };

  const fetchSignals = async () => {
    const response = await apiClient.get({
      url: ENDPOINTS.SIGNALS_LIST,
      auth: true,
    });
    if (response && response.status === 200) {
      console.log(response.data.signals);
      const signals = new Map<string, Signal>(
        response.data.signals.map((signal: Signal) => [signal.id, signal])
      );
      console.log(signals);
      setSignals(signals);
    }
  };

  const fetchEvents = useCallback(async () => {
    const response = await apiClient.get({
      url: ENDPOINTS.SIGNAL_EVENTS_ALL,
      auth: true,
    });
    if (response && response.status === 200) {
      setEvents(response.data.slice(0, 50));
    }
  }, []);

  useEffect(() => {
    fetchSignals();
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [signals, fetchEvents]);

  useSSE(
    `${process.env.NEXT_PUBLIC_API_V2_URL}${ENDPOINTS.SIGNAL_SSE_EVENTS}`,
    handleEvent
  );
  return (
    <div className="w-full min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="bg-white rounded-lg shadow-sm">
        <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold px-4 py-2">Signals</h2>
            <div className="flex items-center">
            <select className="border border-gray-300 rounded-md px-3 py-1 text-xs mr-2">
              <option value="">All Actions</option>
              <option value="BUY">Buy</option>
              <option value="SELL">Sell</option>
            </select>

            <select className="border border-gray-300 rounded-md px-3 py-1 text-xs mr-2">
              <option value="">All Timeframes</option>
              <option value="1h">1 Hour</option>
              <option value="4h">4 Hours</option>
              <option value="1d">1 Day</option>
              <option value="1w">1 Week</option>
            </select>

            <select className="border border-gray-300 rounded-md px-3 py-1 text-xs">
              <option value="">All Signals</option>
              <option value="PRICE_CHANGE">Price Change</option>
              <option value="VOLUME_SPIKE">Volume Spike</option>
              <option value="ACTIVITY_SPIKE">Activity Spike</option>
              <option value="HOLDER_CHANGE">Holder Change</option>
            </select>

            <div>
            <div className="flex items-center space-x-2 ml-4 mr-4">
              <button 
                className="w-20 px-3 py-1 text-xs rounded-md bg-white text-gray-500 hover:bg-gray-100 border border-gray-300"
                onClick={() => {/* TODO: Implement filter */}}
              >
                All
              </button>
              <button 
                className="w-20 px-3 py-1 text-xs rounded-md bg-white text-gray-500 hover:bg-gray-100 border border-gray-300"
                onClick={() => {/* TODO: Implement filter */}}
              >
                Buy
              </button>
              <button 
                className="w-20 px-3 py-1 text-xs rounded-md bg-white text-gray-500 hover:bg-gray-100 border border-gray-300"
                onClick={() => {/* TODO: Implement filter */}}
              >
                Sell
              </button>
            </div>
            </div>
            </div>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-full">
            {/* Desktop view */}
            <table className="w-full border-collapse hidden md:table">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="text-left text-xs text-gray-500 bg-gray-50">
                  <th className="px-4 py-2 text-xs">ACTION</th>
                  <th className="px-4 py-2 text-xs">SYMBOL</th>
                  <th className="px-4 py-2 text-xs">PRICE</th>
                  <th className="px-4 py-2 text-xs">SIGNAL</th>
                  <th className="px-4 py-2 text-xs">TIMEFRAME</th>
                  <th className="px-4 py-2 text-xs">CREATED</th>
                  <th className="px-4 py-2 text-xs">ACTIONS</th>
                  <th className="px-4 py-2 text-xs">DETAILS</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr
                    key={event.id}
                    className="border-b border-gray-100 text-xs text-gray-500"
                  >
                    <td className="text-gray-500 px-4 py-2 text-xs">
                      <div className="flex items-center">
                        <div
                          className={`w-4 h-4 rounded-full mr-2 flex items-center justify-center ${
                            event.action === "BUY"
                              ? "bg-green-400"
                              : "bg-red-400"
                          }`}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-3 h-4 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            {event.action === "BUY" ? (
                              <>
                                {/* Stick (vertical line) */}
                                <line
                                  x1="12"
                                  y1="20"
                                  x2="12"
                                  y2="10"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                />
                                {/* Arrowhead (upward) */}
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 15l7-7 7 7"
                                />
                              </>
                            ) : (
                              <>
                                {/* Stick (vertical line) */}
                                <line
                                  x1="12"
                                  y1="4"
                                  x2="12"
                                  y2="14"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                />
                                {/* Arrowhead (downward) */}
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 9l-7 7-7-7"
                                />
                              </>
                            )}
                          </svg>
                        </div>
                        <span className="text-xs">
                          {event.action.charAt(0).toUpperCase() +
                            event.action.slice(1).toLowerCase()}
                        </span>
                      </div>
                    </td>
                    <td className="text-gray-500 px-4 py-2 text-xs font-bold">
                      {event.symbol}
                    </td>
                    <td className="text-gray-500 px-4 py-2 text-xs">
                      {event.price.toFixed(6)}
                    </td>
                    <td className="text-gray-500 px-4 py-2 text-xs">
                      {signals.get(event.signal_id)?.name || event.signal_id}
                    </td>
                    <td className="text-gray-500 px-4 py-2 text-xs">
                      {signals.get(event.signal_id)?.timeframe || "1m"}
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {getTimeAgo(event.timestamp)}
                    </td>
                    <td className="px-4 py-2 text-xs"></td>
                    <td className="px-4 py-2 text-xs flex justify-end items-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigateToSignalDetail(
                            `${event.signal_id}|${event.token_id}|${event.currency}`
                          );
                        }}
                        className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-md flex items-center transition-colors"
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventSignalsComponent;
