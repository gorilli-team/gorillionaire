const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface UserActivity {
  address: string;
  points: number;
  rank: number;
  v2Access: {
    enabled: boolean;
    enabledAt: string | null;
  };
  dollarValue: number;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface UserResponse {
  userActivity: UserActivity;
}

export class UserService {
  static async getUserActivity(address: string): Promise<UserResponse | null> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/activity/track/me?address=${address}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching user activity:", error);
      return null;
    }
  }

  static async checkV2Access(address: string): Promise<boolean> {
    try {
      const userData = await this.getUserActivity(address);
      return userData?.userActivity?.v2Access?.enabled || false;
    } catch (error) {
      console.error("Error checking V2 access:", error);
      return false;
    }
  }
}
