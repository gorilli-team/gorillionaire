const express = require("express");
const router = express.Router();

router.get("/", async (req, res) => {
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