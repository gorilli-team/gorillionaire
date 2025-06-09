'use client';

import { Suspense } from 'react';
import EventSignalsComponent from '@/app/components/signals/events';
import Protect from '@/app/components/protect/index';

function SignalsContent() {


  return (
    <Protect>
      <EventSignalsComponent />
    </Protect>

  )
  //   <div className="container mx-auto px-4 py-8">
  //     <h1 className="text-3xl font-bold mb-6">Trading Signals</h1>
  //     <div className="bg-white rounded-lg shadow p-6">
  //       <div className="space-y-4">
  //         {signals.map((signal) => (
  //           <div 
  //             key={signal.id}
  //             className={`p-4 rounded-lg border ${
  //               signal.type === 'BUY' ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
  //             }`}
  //           >
  //             <div className="flex justify-between items-center">
  //               <div>
  //                 <span className="font-bold">{signal.symbol}</span>
  //                 <span className={`ml-2 ${
  //                   signal.type === 'BUY' ? 'text-green-600' : 'text-red-600'
  //                 }`}>
  //                   {signal.type}
  //                 </span>
  //               </div>
  //               <div className="text-gray-600">
  //                 ${signal.price.toFixed(2)}
  //               </div>
  //             </div>
  //             <div className="text-sm text-gray-500 mt-1">
  //               {new Date(signal.timestamp).toLocaleString()}
  //             </div>
  //           </div>
  //         ))}
  //         {signals.length === 0 && (
  //           <p className="text-gray-600 text-center py-4">
  //             Waiting for signals...
  //           </p>
  //         )}
  //       </div>
  //     </div>
  //   </div>
  // );
}

export default function SignalsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
        <SignalsContent />
    </Suspense>
  );
}