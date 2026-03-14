const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { AccessToken } = require("livekit-server-sdk");

dotenv.config();

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3001;
const ROOM_NAME = "game-room";
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;

if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_URL) {
  console.error(
    "Missing LIVEKIT_API_KEY, LIVEKIT_API_SECRET, or LIVEKIT_URL in environment.",
  );
  process.exit(1);
}

app.get("/token", async (req, res) => {
  const rawName = req.query.name;
  const name = typeof rawName === "string" ? rawName.trim() : "";

  if (!name) {
    return res.status(400).json({
      error: "Missing required query parameter: name",
    });
  }

  try {
    const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: name,
      name,
    });

    token.addGrant({
      roomJoin: true,
      room: ROOM_NAME,
      canPublish: true,
      canSubscribe: true,
    });

    const jwt = await token.toJwt();

    return res.json({
      token: jwt,
      room: ROOM_NAME,
      livekitUrl: LIVEKIT_URL,
    });
  } catch (error) {
    console.error("Failed to generate LiveKit token:", error);
    return res.status(500).json({
      error: "Failed to generate token",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Token server running on http://localhost:${PORT}`);
});
