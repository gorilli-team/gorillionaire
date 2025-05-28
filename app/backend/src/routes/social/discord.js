const express = require("express");
const router = express.Router();

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_API_URL}/social/discord/callback`;
const SCOPE = "identify guilds email"
const STATE = "discord_auth"

router.get("/connect", (req, res) => {
  const authUrl = `https://discord.com/oauth2/authorize?response_type=code&client_id=${DISCORD_CLIENT_ID}&scope=${encodeURIComponent(
    SCOPE
  )}&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}&state=${STATE}&prompt=consent`;
  return res.redirect(authUrl);
});

router.get("/callback", async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.status(400).json({ error: "Authorization code is missing" });
  }

  try {
    const params = new URLSearchParams();
    params.append("client_id", DISCORD_CLIENT_ID);
    params.append("client_secret", DISCORD_CLIENT_SECRET);
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", REDIRECT_URI);

    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      return res
        .status(500)
        .json({ error: `Token exchange failed: ${errorText}` });
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in, token_type } = tokenData;

    // Add logic to save access token to db

    return res
      .status(200)
      .json({ message: "Access token retrieved successfully" });
  } catch (error) {
    console.error("Token exchange error: ", error);
    return res
      .status(500)
      .json({ error: "Internal server error during token exchange" });
  }
});

router.get("/check-guild", async (req, res) => {
  const guildId = req.query.guildId;
  const authHeader = req.headers.authorization;
  const accessToken = authHeader?.replace("Bearer ", "");

  if (!accessToken) {
    return res.status(401).json({ error: "Missing access token" });
  }

  if (!guildId) {
    return res.status(400).json({ error: "Missing guildId" });
  }

  try {
    const response = await fetch(
      "https://discord.com/api/v10/users/@me/guilds",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const err = await response.json();
      return res.status(response.status).json({
        error: err.message || "Failed to retrieve guilds",
      });
    }

    const guilds = await response.json();
    const isMember = guilds.some((guild) => guild.id === guildId);

    return res.status(200).json({ isMember });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;