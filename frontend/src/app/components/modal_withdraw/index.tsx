import React, { useState } from "react";

interface ModalWithdrawProps {
  isOpen: boolean;
  onClose: () => void;
  onWithdraw: (amount: number) => void;
  allowance: bigint;
}

export const ModalWithdraw: React.FC<ModalWithdrawProps> = ({
  isOpen,
  onClose,
  onWithdraw,
  allowance,
}) => {
  const [withdrawAmount, setWithdrawAmount] = useState<number | string>("");

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWithdrawAmount(e.target.value);
  };

  const handleWithdrawSubmit = () => {
    if (withdrawAmount && !isNaN(Number(withdrawAmount))) {
      onWithdraw(Number(withdrawAmount));
      setWithdrawAmount("");
      onClose();
    } else {
      alert("Please enter a valid amount");
    }
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 flex justify-center items-center bg-gray-500 bg-opacity-50">
          <div className="bg-white p-6 pt-4 rounded-lg shadow-lg w-96 relative">
            <div className="flex justify-between items-center mb-4">
              <div className="text-lg font-semibold">Withdraw on</div>
              <button
                onClick={onClose}
                className="text-xl text-gray-600 hover:text-gray-800"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="flex items-center mb-4">
              <span className="mr-2 text-sm">Token:</span>
              <img
                src="https://cryptologos.cc/logos/ethereum-eth-logo.png"
                alt="ETH"
                className="h-6 w-6"
              />
              <span className="ml-2">ETH</span>
            </div>
            <div className="mb-4">
              <input
                type="number"
                value={withdrawAmount}
                onChange={handleAmountChange}
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholder="Enter amount"
              />
            </div>
            <div>
              <button
                onClick={handleWithdrawSubmit}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg w-full"
              >
                Withdraw
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
