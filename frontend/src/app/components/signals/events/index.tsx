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

    setEvents((prev) => [data, ...prev].slice(0, 50) ); // Keep last 50 signals
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
        const data = response.data as { signals: Signal[] };
        const signals = new Map<string, Signal>(data.signals.map((signal) => [signal.id, signal]));
        setSignals(signals);
    }
  };

  const fetchEvents = useCallback(async () => {
    const response = await apiClient.get({
      url: ENDPOINTS.SIGNAL_EVENTS_ALL,
      auth: true,
    });
    if (response && response.status === 200) {
      const data = response.data as { events: Event[] };
      setEvents(data.events.slice(0, 50));
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
          <h2 className="text-xl font-bold">Signals</h2>
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mt-4">
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {/* Desktop view */}
              <table className="w-full border-collapse hidden md:table">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="text-left text-xs text-gray-500 border-b">
                    <th className="pb-2 font-medium">TIME</th>
                    <th className="pb-2 font-medium">SYMBOL</th>
                    <th className="pb-2 font-medium">SIGNAL NAME</th>
                    <th className="pb-2 font-medium">TIMEFRAME</th>
                    <th className="pb-2 font-medium">PRICE</th>
                    <th className="pb-2 font-medium">ACTION</th>
                    <th className="pb-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.id} className="border-b border-gray-100 text-sm">
                      <td className="py-2 px-4">{getTimeAgo(event.timestamp)}</td>
                      <td className="text-gray-700 font-medium">{event.symbol}</td>
                      <td className="text-gray-700 font-medium">
                        {(() => {
                          console.log('Signal ID:', event.signal_id);
                          console.log('Signals Map:', signals);
                          console.log('Signal from Map:', signals.get(event.signal_id));
                          return signals.get(event.signal_id)?.name || event.signal_id;
                        })()}
                      </td>
                      <td className="text-gray-700 font-medium">{signals.get(event.signal_id)?.timeframe || "1m"}</td>
                      <td className="text-gray-700 font-medium">{event.price}</td>
                      <td className="text-gray-700 font-medium">{event.action}</td>
                      <td className="px-4 pb-4 flex justify-end items-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateToSignalDetail(`${event.signal_id}|${event.token_id}|${event.currency}`);
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
