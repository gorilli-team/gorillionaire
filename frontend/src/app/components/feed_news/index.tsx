import React from "react";
import { Card } from "../vault_card/index";
import styles from "./index.module.css";

interface FeedNewsProps {
  imageUrl: string;
  timestamp: string | Date;
  content: string;
  vaultName: string;
  onDepositClick: (vaultName: string) => void;
  onWithdrawClick: (vaultName: string) => void;
  onCardClick: (vaultName: string) => void;
}

const timeAgo = (timestamp: string | Date) => {
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) {
    return "Invalid date";
  }

  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes !== 1 ? "s" : ""} ago`;
  }

  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const FeedNews: React.FC<FeedNewsProps> = ({
  imageUrl,
  timestamp,
  content,
  vaultName,
  onDepositClick,
  onWithdrawClick,
  onCardClick,
}) => {
  return (
    <div
      className={`${styles.feedNews} pt-6 p-2 flex items-start gap-4 w-[600px]`}
    >
      <img src={imageUrl} alt="Profile" className="w-10 h-10 rounded-full" />
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-gray-800">Gorillionaire</span>
          <span className="text-xs text-gray-500">{timeAgo(timestamp)}</span>
        </div>
        <p className="text-gray-700 mt-2">{content}</p>
        <div className="mt-4">
          <Card
            title={vaultName}
            apy="3.5%"
            tvl="$138.8k"
            chainName="Base"
            chainImage="/base.png"
            onDeposit={() => onDepositClick(vaultName)}
            onWithdraw={() => onWithdrawClick(vaultName)}
            onCardClick={() => onCardClick(vaultName)}
          />
        </div>
      </div>
    </div>
  );
};

export default FeedNews;
