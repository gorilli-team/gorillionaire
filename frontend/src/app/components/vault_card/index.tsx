import React from "react";
import { useAccount } from "wagmi";
import { WalletDefault } from "@coinbase/onchainkit/wallet";
import Image from "next/image";

interface CardProps {
  title: string;
  chainName: string;
  chainImage: string;
  onDeposit: () => void;
  onWithdraw: () => void;
  onCardClick: () => void;
}

export const Card: React.FC<CardProps> = ({
  title,
  chainName,
  chainImage,
  onDeposit,
  onWithdraw,
  onCardClick,
}) => {
  const { address } = useAccount();

  return (
    <div
      onClick={onCardClick}
      className="cursor-pointer bg-white shadow-md rounded-2xl p-4 mx-auto flex-col justify-center text-[14px]"
    >
      <div>
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
      </div>
      <div className="flex gap-2 mt-2">
        <div className="flex items-center justify-center bg-gray-300 p-2 rounded-lg w-1/3">
          <Image
            src="/usdc.jpg"
            alt="USDC"
            width={16}
            height={16}
            className="rounded-full mr-2"
          />
          <span className="text-gray-800">USDC</span>
        </div>
        <div className="flex items-center justify-center bg-gray-300 p-2 rounded-lg w-1/3">
          <Image
            src="/brett.jpg"
            alt="BRETT"
            width={16}
            height={16}
            className="rounded-full mr-2"
          />
          <span className="text-gray-800">BRETT</span>
        </div>
        <div className="flex items-center justify-center bg-gray-300 p-2 rounded-lg w-1/3">
          <Image
            src={chainImage}
            alt={chainName}
            width={16}
            height={16}
            className="rounded-full mr-2"
          />
          <span className="text-gray-800">{chainName}</span>
        </div>
      </div>
      <div className="flex-shrink-0 mt-4 flex gap-2">
        {address ? (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onWithdraw();
              }}
              className="px-4 py-2 bg-white border border-blue-500 hover:bg-blue-500 hover:text-white text-blue-500 font-medium rounded-lg transition w-full"
            >
              Withdraw
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeposit();
              }}
              className="px-4 py-2 bg-blue-500 border border-transparent text-white font-medium rounded-lg hover:bg-white hover:border-blue-500 hover:text-blue-500 transition w-full"
            >
              Deposit
            </button>
          </>
        ) : (
          <div
            className="w-full flex justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <WalletDefault />
          </div>
        )}
      </div>
    </div>
  );
};
