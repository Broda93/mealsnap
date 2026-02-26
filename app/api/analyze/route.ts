import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { analyzeMealImage, checkCostLimit } from "@/lib/gemini";
import { rateLimit, RATE_LIMITS, rateLimitHeaders } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nie zalogowany" }, { status: 401 });
    }

    // Rate limit — 20 AI analyses per day
    const rl = rateLimit(user.id, "analyze", RATE_LIMITS.analyze);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Limit analiz AI wyczerpany. Sprobuj ponownie za ${rl.retryAfter}s.` },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const { image, mimeType, photoMode } = await request.json();

    if (!image || !mimeType) {
      return NextResponse.json(
        { error: "Brak zdjecia lub typu MIME" },
        { status: 400 }
      );
    }

    const analysis = await analyzeMealImage(image, mimeType, user.id, supabase, photoMode || "meal");
    return NextResponse.json(analysis);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Analyze error:", message);

    if (message.startsWith("COST_LIMIT|")) {
      return NextResponse.json(
        { error: message.split("|")[1] },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: message || "Blad analizy zdjecia" },
      { status: 500 }
    );
  }
}

// GET endpoint to check current usage
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nie zalogowany" }, { status: 401 });
  }

  const { used, limit } = await checkCostLimit(user.id, supabase);
  return NextResponse.json({
    used: parseFloat(used.toFixed(4)),
    limit,
    remaining: parseFloat((limit - used).toFixed(4)),
    percentage: parseFloat(((used / limit) * 100).toFixed(1)),
  });
}
