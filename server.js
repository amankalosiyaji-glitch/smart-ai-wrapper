import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { GoogleGenerativeAI } from "@google/generative-ai";
import authRoutes from "./routes/auth.js";
import authMiddleware from "./middleware/authMiddleware.js";
import User from "./models/User.js";
import Content from "./models/Content.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static("public"));

/* ===============================
   🔹 GEMINI INIT
================================ */
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/* ===============================
   🔹 MongoDB Connection
================================ */
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected ✅"))
  .catch(err => console.log("Mongo Error:", err));

/* ===============================
   🔹 AUTH ROUTES
================================ */
app.use("/api/auth", authRoutes);

app.get("/my-content", authMiddleware, async (req, res) => {
  try {
    const contents = await Content.find({ userId: req.user._id })
      .sort({ createdAt: -1 });

    res.json(contents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ===============================
   🔹 ROOT
================================ */
app.get("/", (req, res) => {
  res.send("AI Reel & Shorts Generator Running 🚀");
});

/* ===============================
   🔹 GENERATE REEL + SHORTS
================================ */
app.post("/generate-reel", authMiddleware, async (req, res) => {
  try {
    const topic = req.body.topic?.trim();
    const niche = req.body.niche?.trim();
    const style = req.body.style?.trim();
    const platform = req.body.platform?.trim().toLowerCase(); 

    if (!platform) {
  return res.status(400).json({
    error: "Platform is required"
  });
}

if (!["instagram", "youtube"].includes(platform)) {
  return res.status(400).json({
    error: "Invalid platform selected"
  });
}

    if (!topic || !niche || !style) {
      return res.status(400).json({
        error: "All fields are required"
      });
    }

    const user = await User.findById(req.user._id);

if (!user) {
  return res.status(404).json({
    error: "User not found"
  });
}

if (!user.usageCount) {
  user.usageCount = 0;
}

   const userPlan = user.plan || "free";

if (userPlan === "free" && user.usageCount >= 5) {
      return res.status(403).json({
        error: "Free limit reached. Upgrade plan."
      });
    }

    const isPro = userPlan === "pro";

if (!isPro && style?.toLowerCase().includes("aggressive")) {
  return res.status(403).json({
    error: "Aggressive mode is only available for Pro users."
  });
}

let aggressionInstruction = "";

if (style && style.toLowerCase().includes("aggressive")) {
  aggressionInstruction = `
Make the hook extremely bold and controversial.
Use psychological triggers.
Create strong curiosity gap.
Increase emotional intensity.
`;
}

let platformInstruction = "";

if (platform === "instagram") {
  platformInstruction = `
Create content optimized for Instagram Reels.
Make it emotional and highly engaging.
Add a catchy caption.
Add 10 viral hashtags.
`;
} else if (platform === "youtube") {
  platformInstruction = `
Create content optimized for YouTube Shorts.
Focus heavily on retention.
Add an SEO optimized title.
Add a keyword-rich description.
`;
}

    /* ===============================
       🔥 NEW PRO PROMPT
    ================================= */
    const prompt = `
You are an elite viral short-form content strategist.

${platformInstruction}
${aggressionInstruction}

Respond in this EXACT format:

🎬 HOOK (0-3 sec attention grabber):
(1 very strong curiosity-based line)

🧠 BODY:
(4-6 short punchy lines, Hindi + simple English mix, high retention)

🔥 CTA:
(Encourage follow / subscribe / comment)

📸 INSTAGRAM CAPTION:
(2-3 engaging lines)

#️⃣ INSTAGRAM HASHTAGS:
(8-12 relevant hashtags)

▶ YOUTUBE TITLE:
(SEO optimized clickable title under 60 characters)

📝 YOUTUBE DESCRIPTION:
(2-3 line short description with keywords)

Make it emotional, engaging and scroll-stopping.
Keep sentences short.
Add curiosity gap in hook.

Topic: ${topic}
Niche: ${niche}
Style: ${style}
`;

    /* 🔥 GEMINI CALL */
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash"
    });

    const result = await model.generateContent(prompt);
    const text = result?.response?.text()?.trim();

    if (!text) {
      return res.status(500).json({
        error: "AI failed to generate content."
      });
    }

    await Content.create({
  userId: user._id,
  topic,
  niche,
  style,
  platform,
  result: text
});

    /* 🔥 Increase Usage Count */
    user.usageCount += 1;
    await user.save();

    res.json({
      result: text,
      remaining:
        userPlan === "free"
          ? Math.max(0, 5 - user.usageCount)
          : "Unlimited"
    });

  } catch (error) {
    console.error("Generate Error:", error);
    res.status(500).json({
      error: error.message
    });
  }
});

/* ===============================
   🔹 SERVER START
================================ */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} 🚀`);
});