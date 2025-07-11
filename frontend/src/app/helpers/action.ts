// import { useAuth } from "@/app/contexts/AuthContext";
// import { useSignals } from "@/app/contexts/SignalsContext";
// import { useTokens } from "@/app/contexts/TokensContext";
// import { useDex } from "@/app/contexts/DexContext";
// import { toast, useToast } from "react-toastify";
// import { useCallback } from "react";
// import { Token } from "../types";
// import { MONAD_CHAIN_ID } from "../utils/constants";
// import { User } from "./auth";
// import { usePrivy } from "@privy-io/react-auth";

// export const onYes = async (token: Token, amount: number, type: "Buy" | "Sell", chainId: number, setCurrentDexToken: (token: Token) => void, setCurrentDexAmount: (amount: number) => void, setCurrentDexType: (type: "Buy" | "Sell") => void, setIsModalOpen: (isOpen: boolean) => void) => {
//     const { user } = usePrivy();
//     if (!user?.wallet?.address) return;

//       // Check if we're on Monad network
//       if (chainId !== MONAD_CHAIN_ID) {
//         toast.error("Please switch to Monad network to continue", {
//           position: "top-right",
//           autoClose: 5000,
//           hideProgressBar: false,
//           closeOnClick: true,
//           draggable: true,
//           progress: undefined,
//           theme: "light",
//         });
//         return;
//       }

//       // Open DEX modal instead of executing trade directly
//       setCurrentDexToken(token);
//       setCurrentDexAmount(amount);
//       setCurrentDexType(type);
//       setIsModalOpen(true);
//     }

//     // const onNo = useCallback((signalId: string) => {
//     //     // Update the signal's userSignal property without removing it
//     //     setBuySignals((prev) =>
//     //       prev.map((signal) =>
//     //         signal._id === signalId
//     //           ? { ...signal, userSignal: { choice: "No" } }
//     //           : signal
//     //       )
//     //     );
//     //     setSellSignals((prev) =>
//     //       prev.map((signal) =>
//     //         signal._id === signalId
//     //           ? { ...signal, userSignal: { choice: "No" } }
//     //           : signal
//     //       )
//     //     );
//     //   }, []);


// export const handleOptionSelect = 
//     async (signalId: string, token: string, option: "Yes" | "No") => {
//     //   setSelectedOptions({
//     //     ...selectedOptions,
//     //     [signalId]: option, 
//     //   });

//       if (option === "Yes") {
//         // const signal =
//         //   buySignals.find((s) => s._id === signalId) ||
//         //   sellSignals.find((s) => s._id === signalId);
//         // if (!signal) return;

//         // const { symbol, amount } = parseSignalText(signal.signal_text);
//         // const token = tokens.find((t) => symbol === t.symbol);
//         // if (!token) return;

//         // // Set current signal ID for later updates
//         // setCurrentSignalId(signalId);
//         // await onYes(token, amount, signal.type);
//       } else {
//         const privyToken = Cookies.get("privy-token");
//         const response = await fetch(
//           `${process.env.NEXT_PUBLIC_API_URL}/signals/generated-signals/user-signal`,
//           {
//             method: "POST",
//             headers: {
//               "Content-Type": "application/json",
//               Authorization: `Bearer ${privyToken}`,
//             },
//             body: JSON.stringify({
//               userAddress: address,
//               signalId,
//               choice: option,
//             }),
//           }
//         );

//         if (response.status === 400) {
//           toast.error("You have already 5 No signals in the last 24 hours");
//           return;
//         }

//         // onNo(signalId);
//     }
//   }
// };