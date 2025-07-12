import sendTelegramNotification from "../services/telegram";

export class TransferTracker {
  private tokenName: string;
  private trackedHour: number;
  private trackedMonth: number;
  private transfersPerHour: number;
  private previousHourTransfers: number;
  private lastProcessedHour: number | null;
  constructor(tokenName: string) {
    const now = new Date();
    this.tokenName = tokenName;
    this.trackedHour = now.getHours();
    this.trackedMonth = now.getMonth();
    this.transfersPerHour = 0;
    this.previousHourTransfers = 0;
    this.lastProcessedHour = null;
  }

  private formatDateTime(date: Date): string {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const day = date.getDate().toString().padStart(2, "0");
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const hour = date.getHours().toString().padStart(2, "0");

    return `${day} ${month} ${hour}:00, ${year}`;
  }

  async trackTransfer(
    entity: any,
    tokenSymbol: string,
    tokenName: string,
    tokenDecimals: number,
    tokenAddress: string
  ): Promise<void> {
    const date = new Date(Number(entity.block.timestamp) * 1000);
    const currentHour = date.getHours();
    const currentDate = date.toISOString();

    // Initialize trackedHour if it's the first run
    if (this.trackedHour === null || this.trackedHour === undefined) {
      this.trackedHour = currentHour;
      this.transfersPerHour = 0;
      this.previousHourTransfers = 0;
      this.lastProcessedHour = null;
    }

    // If we've moved to a new hour and haven't processed this hour transition yet
    if (
      currentHour !== this.trackedHour &&
      currentHour !== this.lastProcessedHour
    ) {
      console.log("NEW HOUR", currentHour, this.trackedHour, currentDate);
      console.log(
        `[${tokenName}] Hourly Summary: ${
          this.transfersPerHour
        } transfers at ${this.formatDateTime(
          new Date(date.getTime() - 3600000)
        )}`
      );

      // Store current transfers before reset
      const completedHourTransfers = this.transfersPerHour;
      // Record that we've processed this hour transition to prevent duplicates
      this.lastProcessedHour = currentHour;

      // Check for spike
      if (
        completedHourTransfers > this.previousHourTransfers &&
        this.previousHourTransfers > 0
      ) {
        try {
          const response = await fetch(
            `${process.env.ENVIO_API_BASE_URL}/events/spike`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-api-key": process.env.ENVIO_BACKEND_API_KEY || "",
              },
              body: JSON.stringify({
                tokenName,
                tokenSymbol,
                tokenDecimals,
                tokenAddress,
                thisHourTransfers: completedHourTransfers,
                previousHourTransfers: this.previousHourTransfers,
                blockNumber: entity.block.number.toString(),
                blockTimestamp: entity.block.timestamp.toString(),
              }),
            }
          );

          if (!response.ok) {
            const errorText = await response.text();
            console.error(
              `Failed to store transfer: ${response.status} - ${errorText}`
            );
          } else {
            const percentIncrease =
              this.previousHourTransfers > 0
                ? ((completedHourTransfers - this.previousHourTransfers) /
                    this.previousHourTransfers) *
                  100
                : 0;

            const message =
              `🚨 ${tokenName} Spike: ${completedHourTransfers.toLocaleString()} transfers\n` +
              `Previous: ${this.previousHourTransfers.toLocaleString()} (+${percentIncrease.toFixed(
                2
              )}%)\n` +
              `Time: ${this.formatDateTime(
                new Date(date.getTime() - 3600000)
              )}`;

            if (date < new Date(Date.now() - 3600000)) {
              await sendTelegramNotification(message);
            }
            console.log("ACTIVE_SPIKE stored successfully");
          }
        } catch (error) {
          console.error("Error processing spike:", error);
        }
      }

      // Update tracking variables for the new hour
      this.previousHourTransfers = completedHourTransfers; // This is correct - keep this hour's transfers as previous
      this.transfersPerHour = 1; // This transfer counts for the new hour
      this.trackedHour = currentHour;

      console.log(
        `[${tokenName}] Hour transition complete - Previous hour had: ${this.previousHourTransfers} transfers, New hour starts with: 1`
      );
    } else {
      // Same hour, just increment the counter
      this.transfersPerHour++;

      // Update the trackedHour if it's different but we've already processed this transition
      if (
        currentHour !== this.trackedHour &&
        currentHour === this.lastProcessedHour
      ) {
        this.trackedHour = currentHour;
      }
    }
  }

  getStats(): {
    transfersPerHour: number;
    previousHourTransfers: number;
    trackedHour: number;
    trackedMonth: number;
  } {
    return {
      transfersPerHour: this.transfersPerHour,
      previousHourTransfers: this.previousHourTransfers,
      trackedHour: this.trackedHour,
      trackedMonth: this.trackedMonth,
    };
  }
}
