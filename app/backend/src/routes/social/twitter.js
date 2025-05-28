const express = require("express");
const router = express.Router();
const crypto = require("crypto");

const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID;
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_API_URL}/social/twitter/callback`;
const BASIC_AUTH = Buffer.from(
  `${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`
).toString("base64");
const SCOPE = "tweet.read users.read follows.read offline.access";

router.get("/connect", (req, res) => {
  const codeVerifier = crypto.randomBytes(64).toString("hex");
  req.session.codeVerifier = codeVerifier;

  const hash = crypto.createHash("sha256").update(codeVerifier).digest();
  const base64url = hash
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const authUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${TWITTER_CLIENT_ID}&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}&scope=${encodeURIComponent(
    SCOPE
  )}&state=some_random_state&code_challenge=${base64url}&code_challenge_method=S256`;
  res.redirect(authUrl);
});

router.get("/callback", async (req, res) => {
  const code = req.query.code;
  const codeVerifier = req.session.codeVerifier

  if (!code) {
    return res.status(400).json({ error: "Authorization code is missing" });
  }

  if (!codeVerifier) {
    return res.status(400).json({ error: "Code verifier is missing" });
  }

  try {
    const params = new URLSearchParams();
    params.append("code", code);
    params.append("grant_type", "authorization_code");
    params.append("redirect_uri", REDIRECT_URI);
    params.append("client_id", TWITTER_CLIENT_ID);
    params.append("code_verifier", codeVerifier)

    const response = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${BASIC_AUTH}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Token exchange failed", data);
      return res
        .status(500)
        .json({ error: "Token exchange failed", details: data });
    }

    const { access_token, refresh_token, expires_in, token_type } = data;

    // Add logic to store access_token in db here

    return res.status(200).json({
      message: "Access token retrieved successfully",
      access_token,
      refresh_token,
    });
  } catch (err) {
    console.error("Error exchanging code: ", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/check-following", async (req, res) => {
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
