const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface AccessCodeResponse {
  success: boolean;
  message: string;
  v2Enabled?: boolean;
}

export interface V2StatusResponse {
  success: boolean;
  v2Enabled: boolean;
  enabledAt?: string;
  accessCodeUsed?: string;
}

export class AccessService {
  static async verifyAccessCode(
    code: string,
    address: string
  ): Promise<AccessCodeResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/access/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code, address }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error verifying access code:", error);
      return {
        success: false,
        message: "Network error. Please try again.",
      };
    }
  }

  static async checkV2Status(address: string): Promise<V2StatusResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/access/status/${address}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error checking V2 status:", error);
      return {
        success: false,
        v2Enabled: false,
      };
    }
  }
}
