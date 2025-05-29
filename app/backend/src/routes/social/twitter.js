const express = require("express");
const router = express.Router();
const crypto = require("crypto");

const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID;
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET;
const BASIC_AUTH = Buffer.from(
  `${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`
).toString("base64");
const TWITTER_REDIRECT_URI = process.env.TWITTER_REDIRECT_URI;
const TWITTER_TARGET_USERNAME = process.env.TWITTER_TARGET_USERNAME;
const SCOPE = "tweet.read users.read follows.read offline.access";

router.get("/connect", (req, res) => {
  const state = crypto.randomBytes(16).toString("hex");
  const codeVerifier = crypto.randomBytes(64).toString("hex");
  req.session.oauthState = state;
  req.session.codeVerifier = codeVerifier;

  const hash = crypto.createHash("sha256").update(codeVerifier).digest();
  const base64url = hash
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const authUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${TWITTER_CLIENT_ID}&redirect_uri=${encodeURIComponent(
    TWITTER_REDIRECT_URI
  )}&scope=${encodeURIComponent(
    SCOPE
  )}&state=${state}&code_challenge=${base64url}&code_challenge_method=S256`;
  res.redirect(authUrl);
});

router.get("/callback", async (req, res) => {
  const returnedState = req.query.state;
  const originalState = req.session.oauthState;
  const code = req.query.code;
  const codeVerifier = req.session.codeVerifier;

  if (!returnedState || returnedState != originalState) {
    return res.status(400).json({ error: "Invalid state" });
  }

  delete req.session.oauthState;

  if (!code) {
    return res.status(400).json({ error: "Authorization code is missing" });
  }

  if (!codeVerifier) {
    return res.status(400).json({ error: "Code verifier is missing" });
  }

  delete req.session.codeVerifier;

  try {
    const params = new URLSearchParams();
    params.append("code", code);
    params.append("grant_type", "authorization_code");
    params.append("redirect_uri", TWITTER_REDIRECT_URI);
    params.append("client_id", TWITTER_CLIENT_ID);
    params.append("code_verifier", codeVerifier);

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

    try {
      const isFollowing = await checkTwitterFollowing(
        access_token,
        TWITTER_TARGET_USERNAME
      );
      return res.redirect(`/?isFollowing=${isFollowing}`);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  } catch (err) {
    console.error("Error exchanging code: ", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

async function checkTwitterFollowing(accessToken, targetUsername) {
  if (!accessToken) {
    throw new Error("Access token is missing");
  }

  if (!targetUsername) {
    throw new Error("Target username is missing");
  }

  const userResp = await fetch("https://api.twitter.com/2/users/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!userResp.ok) {
    const err = await userResp.json();
    throw new Error(err.detail || "Error fetching userId");
  }

  const userData = await userResp.json();
  console.log("User data: ", userData);
  const userId = userData?.data?.id;

  if (!userId) {
    throw new Error("User ID not found");
  }

  const followingResp = await fetch(
    `https://api.twitter.com/2/users/${userId}/following`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  console.log("Following response: ", followingResp);

  if (!followingResp.ok) {
    const err = await followingResp.json();
    throw new Error(err.detail || "Error fetching following list");
  }

  const followingData = await followingResp.json();
  console.log("Following data: ", followingData);
  const isFollowing = followingData?.data?.some(
    (account) => account.username == targetUsername
  );

  return !!isFollowing;
}

module.exports = router;
