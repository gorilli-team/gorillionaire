const express = require("express");
const router = express.Router();
const crypto = require("crypto");

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI;
const GORILLIONAIRE_GUILD_ID = process.env.GORILLIONAIRE_GUILD_ID;
const SCOPE = "identify guilds email";

router.get("/connect", (req, res) => {
  const state = crypto.randomBytes(16).toString("hex");
  req.session.oauthState = state;

  const authUrl = `https://discord.com/oauth2/authorize?response_type=code&client_id=${DISCORD_CLIENT_ID}&scope=${encodeURIComponent(
    SCOPE
  )}&redirect_uri=${encodeURIComponent(
    DISCORD_REDIRECT_URI
  )}&state=${state}&prompt=consent`;
  return res.redirect(authUrl);
});

router.get("/callback", async (req, res) => {
  const code = req.query.code;
  const returnedState = req.query.state;
  const originalState = req.session.oauthState;

  if (!returnedState || returnedState != originalState) {
    return res.status(400).json({ error: "Invalid state" });
  }

  delete req.session.oauthState;

  if (!code) {
    return res.status(400).json({ error: "Authorization code is missing" });
  }

  try {
    const params = new URLSearchParams();
    params.append("client_id", DISCORD_CLIENT_ID);
    params.append("client_secret", DISCORD_CLIENT_SECRET);
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", DISCORD_REDIRECT_URI);

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

    // Add logic to save access token to db if needed

    try {
      const isMember = await checkDiscordGuildMembership(
        access_token,
        GORILLIONAIRE_GUILD_ID
      );
      return res.redirect(`/?isMember=${isMember}`);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  } catch (error) {
    console.error("Token exchange error: ", error);
    return res
      .status(500)
      .json({ error: "Internal server error during token exchange" });
  }
});

async function checkDiscordGuildMembership(accessToken, guildId) {
  if (!accessToken) {
    throw new Error("Missing access token");
  }
  if (!guildId) {
    throw new Error("Missing guildId");
  }

  const response = await fetch("https://discord.com/api/v10/users/@me/guilds", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const err = await response.json();
    const message = err.message || "Failed to retrieve guilds";
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  const guilds = await response.json();
  return guilds.some((guild) => guild.id === guildId);
}

module.exports = router;
