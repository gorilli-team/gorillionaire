import React, { useEffect, useState } from "react";
import { Card } from "../vault_card/index";
import VaultDetail from "../vault_detail/index";
import { ModalDeposit } from "../modal_deposit";
import FeedNews from "../feed_news/index";
import styles from "./index.module.css";
import {
  useAccount,
  useReadContract,
  useSendTransaction,
  useWriteContract,
} from "wagmi";

import { TransactionDefault } from "@coinbase/onchainkit/transaction";
import {
  Transaction,
  TransactionButton,
  TransactionSponsor,
  TransactionStatus,
  TransactionStatusAction,
  TransactionStatusLabel,
} from "@coinbase/onchainkit/transaction";
import { WalletDefault } from "@coinbase/onchainkit/wallet";
import { vaultAbi } from "../../../../public/abi/vaultabi";
import { erc20abi } from "../../../../public/abi/erc20abi";
import { ModalWithdraw } from "../modal_withdraw";

const VAULT_ADDRESS =
  "0x5B1C72fEC49EfdDBc12E57fe1837D27B1356f8ed" as `0x${string}`;
const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

interface MainProps {
  selectedPage: string;
  selectedVault: string | null;
  setSelectedVault: React.Dispatch<React.SetStateAction<string | null>>;
}

export default function Main({
  selectedPage,
  selectedVault,
  setSelectedVault,
}: MainProps) {
  const { address } = useAccount();
  const { data: hash, writeContract } = useWriteContract();

  const account = useAccount();

  useEffect(() => {
    console.log("useAccount() Data:", account);
  }, [account]);

  const { data: allowanceData } = useReadContract({
    abi: erc20abi,
    address: USDC_ADDRESS,
    functionName: "allowance",
    args: [address || "0x0", VAULT_ADDRESS],
  });
  const { data: withdrawData } = useReadContract({
    abi: vaultAbi,
    address: VAULT_ADDRESS,
    functionName: "maxWithdraw",
    args: [address || "0x0"],
  });

  const [isDepositModalOpen, setDepositIsModalOpen] = useState(false);
  const [isWithdrawModalOpen, setWithdrawIsModalOpen] = useState(false);
  const [allowance, setAllowance] = useState(BigInt(0));
  const [withdrawableAmount, setWithdrawableAmount] = useState(BigInt(0));
  const [selectedVaultForDeposit, setSelectedVaultForDeposit] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (allowanceData) {
      console.log("inside useffect1");
      setAllowance(allowanceData);
    }
  }, [allowanceData, address, isDepositModalOpen]);

  useEffect(() => {
    if (withdrawData) {
      console.log("inside use effect");
      console.log(withdrawData);
      setWithdrawableAmount(withdrawData);
    }
  }, [withdrawData, address, isWithdrawModalOpen]);

  const handleDeposit = (amount: number) => {
    console.log(`Depositing ${amount} USDC`);
    const amountParsed = BigInt(amount * Math.pow(10, 6));
    if (!address) {
      console.log("no wallet connected");
      return;
    }
    console.log({ amountParsed });
    if (allowance < amountParsed) {
      console.log("Less allowance, approving token");
      writeContract({
        address: USDC_ADDRESS,
        abi: erc20abi,
        functionName: "approve",
        args: [VAULT_ADDRESS, BigInt(amount * Math.pow(10, 6))],
      });
    } else {
      writeContract({
        address: VAULT_ADDRESS,
        abi: vaultAbi,
        functionName: "deposit",
        args: [amountParsed, address],
      });
    }

    setDepositIsModalOpen(false);
  };
  console.log({ withdrawableAmount });
  const handleWithdraw = (amount: number) => {
    const amountParsed = BigInt(amount * Math.pow(10, 6));
    if (amountParsed > withdrawableAmount)
      return alert("Max withdrawable amount reached");

    if (!address) {
      console.log("no wallet connected");
      return;
    }
    console.log(address);
    writeContract({
      address: VAULT_ADDRESS,
      abi: vaultAbi,
      functionName: "withdraw",
      args: [amountParsed, address, address],
    });

    setDepositIsModalOpen(false);
  };

  //  const handleCardClick = (vaultName: string) => {
  //   setSelectedVault(vaultName);
  //  };

  // const handleBack = () => {
  //   setSelectedVault(null);
  // };

  const handleDepositClick = (vaultName: string) => {
    setSelectedVaultForDeposit(vaultName);
    setDepositIsModalOpen(true);
  };
  const handleWithdrawClick = (vaultName: string) => {
    setSelectedVaultForDeposit(vaultName);
    setWithdrawIsModalOpen(true);
  };

  const renderContent = () => {
    if (selectedVault) {
      return <VaultDetail vaultName={selectedVault} />;
    }

    switch (selectedPage) {
      case "Feed":
        return (
          <div className="w-full flex flex-col justify-center items-center p-4 text-gray-800">
            <FeedNews
              imageUrl="/gorillionaire.jpg"
              timestamp={new Date().toISOString()}
              content="Yo degens! Just sold some PENGU and bought WOW. Time to ride the meme coin wave! 🌊🚀 WAGMI!"
              vaultName="Vault Test 1"
              onDepositClick={handleDepositClick}
              onWithdrawClick={handleWithdrawClick}
              onCardClick={setSelectedVault}
            />
          </div>
        );
      case "My Account":
        return (
          <div className="p-6 pt-4 text-gray-800">
            <div className="text-xl font-bold text-gray-800 mb-4">
              Welcome back!
            </div>
            <div className="flex items-center bg-white shadow-md rounded-2xl p-4 mb-6">
              <img
                src="/user.jpg"
                alt="User Profile"
                className="h-12 w-12 rounded-full mr-4"
              />
              <div>
                <h2 className="text-lg font-semibold text-gray-800">
                  Your Wallet
                </h2>
                <p className="text-gray-600">{account.address}</p>
              </div>
            </div>

            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Your Investments
            </h2>
            <div className="grid grid-cols-4 gap-2 w-full flex">
              <Card
                title="Vault Test 1"
                apy="3.5%"
                tvl="$138.8k"
                chainName="Base"
                chainImage="/base.png"
                onDeposit={() => handleDepositClick("Vault Test 1")}
                onWithdraw={() => handleWithdrawClick("Vault Test 1")}
                onCardClick={() => setSelectedVault("Vault Test 1")}
              />
            </div>
          </div>
        );
      case "Vault":
        return <VaultDetail vaultName="Vault Test 1" />;
      default:
        return <div className="p-4 text-gray-800">Select a page</div>;
    }
  };

  return (
    <main
      className={`flex-1 overflow-y-auto bg-gray-200 ${styles.mainContent}`}
    >
      {renderContent()}

      <ModalDeposit
        isOpen={isDepositModalOpen}
        onClose={() => setDepositIsModalOpen(false)}
        onDeposit={handleDeposit}
        allowance={allowance}
      />

      <ModalWithdraw
        isOpen={isWithdrawModalOpen}
        onClose={() => setWithdrawIsModalOpen(false)}
        onWithdraw={handleWithdraw}
        allowance={allowance}
      />
    </main>
  );
}
