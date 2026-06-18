import { NextResponse } from "next/server";

// Memory cache to prevent exceeding the YouTube Data API quota (10,000 units/day)
const videoCache = new Map<string, { data: Record<string, unknown>; expiry: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes cache duration

// Fallback high-quality mock workout videos with real working IDs and high-res thumbnails
const FALLBACK_VIDEOS: Record<string, Record<string, unknown>[]> = {
  hiit: [
    {
      id: { videoId: "ml6cT4AZz78" },
      snippet: {
        title: "20 Min Full Body HIIT Workout - No Equipment",
        description: "A fast, intense workout targeting all major muscle groups.",
        thumbnails: { medium: { url: "https://img.youtube.com/vi/ml6cT4AZz78/0.jpg" } },
        channelTitle: "Self",
      },
    },
    {
      id: { videoId: "M0uO8OBBeXE" },
      snippet: {
        title: "15 Minute Fat Burning HIIT Workout",
        description: "Quick high-intensity interval routine to burn calories fast.",
        thumbnails: { medium: { url: "https://img.youtube.com/vi/M0uO8OBBeXE/0.jpg" } },
        channelTitle: "MadFit",
      },
    },
  ],
  strength: [
    {
      id: { videoId: "UItWltVZZmE" },
      snippet: {
        title: "30 Min Full Body Strength Training - Dumbbells",
        description: "Targeted resistance routine for core muscle groups.",
        thumbnails: { medium: { url: "https://img.youtube.com/vi/UItWltVZZmE/0.jpg" } },
        channelTitle: "HASfit",
      },
    },
    {
      id: { videoId: "r4MzxtB1JII" },
      snippet: {
        title: "20 Min Dumbbell Upper Body Workout",
        description: "Focus on chest, arms, shoulders, and upper back.",
        thumbnails: { medium: { url: "https://img.youtube.com/vi/r4MzxtB1JII/0.jpg" } },
        channelTitle: "FitnessBlender",
      },
    },
  ],
  focus: [
    {
      id: { videoId: "g_tea8ZNk5A" },
      snippet: {
        title: "15 Min Daily Stretch & Flexibility Routine",
        description: "Slow-paced mindful stretching for flexibility and recovery.",
        thumbnails: { medium: { url: "https://img.youtube.com/vi/g_tea8ZNk5A/0.jpg" } },
        channelTitle: "Yoga With Adriene",
      },
    },
    {
      id: { videoId: "4pLUleSuWZg" },
      snippet: {
        title: "10 Min Mindful Breathing and Active Recovery",
        description: "Breathing drills to bring heart rate back to resting levels.",
        thumbnails: { medium: { url: "https://img.youtube.com/vi/4pLUleSuWZg/0.jpg" } },
        channelTitle: "Boho Beautiful Yoga",
      },
    },
  ],
  agility: [
    {
      id: { videoId: "T7y_Z6lS8xQ" },
      snippet: {
        title: "15 Min Agility and Footwork Ladder Drills",
        description: "High-speed coordination drill targeting reaction time.",
        thumbnails: { medium: { url: "https://img.youtube.com/vi/T7y_Z6lS8xQ/0.jpg" } },
        channelTitle: "Nike Training Club",
      },
    },
    {
      id: { videoId: "9o0Tz81TzQA" },
      snippet: {
        title: "20 Min Athletic Coordination and Speed Training",
        description: "Improve balance and dynamic acceleration capacity.",
        thumbnails: { medium: { url: "https://img.youtube.com/vi/9o0Tz81TzQA/0.jpg" } },
        channelTitle: "Overtime Athletes",
      },
    },
  ],
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "cardio workout";
    const cacheKey = query.trim().toLowerCase();

    // Check memory cache
    const cached = videoCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return NextResponse.json({ items: cached.data, source: "cache" });
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      // Map general query categories to fallback mock lists
      let categoryKey = "hiit";
      if (cacheKey.includes("strength") || cacheKey.includes("weight")) categoryKey = "strength";
      else if (
        cacheKey.includes("stretch") ||
        cacheKey.includes("breathing") ||
        cacheKey.includes("flexibility")
      )
        categoryKey = "focus";
      else if (
        cacheKey.includes("agility") ||
        cacheKey.includes("speed") ||
        cacheKey.includes("footwork")
      )
        categoryKey = "agility";

      const items = FALLBACK_VIDEOS[categoryKey] || FALLBACK_VIDEOS["hiit"];
      return NextResponse.json({ items, source: "fallback-mock" });
    }

    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=4&q=${encodeURIComponent(query)}&type=video&key=${apiKey}`;

    const apiRes = await fetch(searchUrl);
    const resData = await apiRes.json();

    if (resData.error) {
      console.warn("[YouTube API Response Error] Fallback triggered:", resData.error.message);
      throw new Error(resData.error.message || "YouTube API query failed");
    }

    const videos = resData.items || [];
    videoCache.set(cacheKey, { data: videos, expiry: Date.now() + CACHE_TTL });

    return NextResponse.json({ items: videos, source: "network" });
  } catch (err: unknown) {
    console.error("[YouTube API Proxy Route Error]");
    // Secure fallback: never break the UI, return fallback items if API calls fail
    const queryStr = new URL(req.url).searchParams.get("q") || "hiit";
    let catKey = "hiit";
    if (queryStr.includes("strength")) catKey = "strength";
    else if (queryStr.includes("focus")) catKey = "focus";
    else if (queryStr.includes("agility")) catKey = "agility";
    return NextResponse.json({
      items: FALLBACK_VIDEOS[catKey] || FALLBACK_VIDEOS["hiit"],
      source: "error-fallback",
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
