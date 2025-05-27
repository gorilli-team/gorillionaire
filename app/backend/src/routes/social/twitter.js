const express = require("express");
const router = express.Router();

router.get("/", async (req, res) => {
  const targetUsername = req.query.target;
  const authHeader = req.headers.authorization;
  const accessToken = authHeader?.replace("Bearer ", "");

  if (!accessToken) {
    return res.status(401).json({ error: "Missing access token" });
  }

  if (!targetUsername) {
    return res.status(400).json({ error: "Missing target username" });
  }

  try {
    const userResp = await fetch("https://api.twitter.com/2/users/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userResp.ok) {
      const err = await userResp.json();
      return res.status(userResp.status).json({
        error: err.detail || "Error fetching userId",
      });
    }

    const userData = await userResp.json();
    const userId = userData?.data?.id;

    if (!userId) {
      return res.status(404).json({ error: "User ID not found" });
    }

    const followingResp = await fetch(
      `https://api.twitter.com/2/users/${userId}/following`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!followingResp.ok) {
      const err = await followingResp.json();
      return res.status(followingResp.status).json({
        error: err.detail || "Error fetching following list",
      });
    }

    const followingData = await followingResp.json();
    const isFollowing = followingData?.data?.some(
      (account) => account.username === targetUsername
    );

    return res.status(200).json({ isFollowing: !!isFollowing });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;