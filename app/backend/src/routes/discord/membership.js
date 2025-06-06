require("dotenv").config();
const express = require("express");
const router = express.Router();

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI;
const GORILLIONAIRE_GUILD_ID = process.env.GORILLIONAIRE_GUILD_ID;

router.post("/verify", async (req, res) => {

  const { code, address } = req.body;
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
    return res.status(500).json({ error: `Token exchange failed: ${errorText}` });
  }

    const tokenData = await tokenResponse.json();
    const { access_token } = tokenData;

    // Check Discord guild membership
    const isMember = await checkDiscordGuildMembership(access_token, GORILLIONAIRE_GUILD_ID);
    
    if (isMember) {
      // TODO: Save to database that this address has Discord connected
      console.log(`✅ Address ${address} is a Discord member!`);
    }
    
    // Return JSON response
    return res.json({ 
      isMember: isMember,
      address: address 
    });

  } catch (error) {
    console.error("Token exchange error:", error);
    return res.status(500).json({ error: "Internal server error during token exchange" });
  }
});

async function checkDiscordGuildMembership(accessToken, guildId) {
  if (!accessToken) {
    throw new Error("Missing access token");
  }
  if (!guildId) {
    throw new Error("Missing guild ID");
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