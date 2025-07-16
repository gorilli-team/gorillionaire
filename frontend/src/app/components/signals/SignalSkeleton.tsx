import React from "react";

const SignalSkeleton = () => {
  return (
    <div className="animate-pulse">
      <div className="border-b pb-4 last:border-b-0 last:pb-0">
        <div className="flex justify-between items-center mb-3 p-3 rounded-lg border border-gray-100">
          <div className="flex items-center">
            <div className="w-6 h-6 rounded-full bg-gray-200 mr-2"></div>
            <div className="h-4 bg-gray-200 rounded w-48"></div>
            <div className="w-4 h-4 ml-2 bg-gray-200 rounded"></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-16 h-5 bg-gray-200 rounded"></div>
            <div className="w-20 h-5 bg-gray-200 rounded"></div>
          </div>
        </div>

        <div className="flex items-center mb-3">
          <div className="inline-flex rounded-full border border-gray-300 overflow-hidden">
            <div className="w-16 h-8 bg-gray-200"></div>
            <div className="w-16 h-8 bg-gray-200"></div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="w-20 h-5 bg-gray-200 rounded-full"></div>
          <div className="w-24 h-5 bg-gray-200 rounded-full"></div>
        </div>

        <div className="w-16 h-3 bg-gray-200 rounded mt-2"></div>
      </div>
    </div>
  );
};

export default SignalSkeleton;
