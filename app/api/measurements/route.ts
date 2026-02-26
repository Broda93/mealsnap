import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { rateLimit, RATE_LIMITS, rateLimitHeaders } from "@/lib/rate-limit";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nie zalogowany" }, { status: 401 });
  }

  const rl = rateLimit(user.id, "measurements", RATE_LIMITS.measurements);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Zbyt wiele zapytan. Sprobuj za ${rl.retryAfter}s.` },
      { status: 429, headers: rateLimitHeaders(rl) }
    );
  }

  const { searchParams } = new URL(request.url);
  const limitParam = parseInt(searchParams.get("limit") || "90", 10);
  const limit = Math.max(1, Math.min(isNaN(limitParam) ? 90 : limitParam, 500));
  const from = searchParams.get("from");

  if (from && !ISO_DATE.test(from)) {
    return NextResponse.json({ error: "Nieprawidlowy format daty" }, { status: 400 });
  }

  let query = supabase
    .from("body_measurements")
    .select("*")
    .eq("profile_id", user.id)
    .order("date", { ascending: false })
    .limit(limit);

  if (from) {
    query = query.gte("date", from);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Measurements fetch error:", error);
    return NextResponse.json({ error: "Blad pobierania pomiarow" }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nie zalogowany" }, { status: 401 });
    }

    const rl = rateLimit(user.id, "measurements", RATE_LIMITS.measurements);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Zbyt wiele zapisan. Sprobuj za ${rl.retryAfter}s.` },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const body = await request.json();
    const { date, weight_kg, body_fat_percent, notes } = body;

    // Validate date format
    if (date && !ISO_DATE.test(date)) {
      return NextResponse.json({ error: "Nieprawidlowy format daty" }, { status: 400 });
    }

    // Validate weight
    const weight = Number(weight_kg);
    if (!weight || weight < 20 || weight > 500) {
      return NextResponse.json({ error: "Nieprawidlowa waga (20-500 kg)" }, { status: 400 });
    }

    // Validate body fat if provided
    if (body_fat_percent !== null && body_fat_percent !== undefined) {
      const bf = Number(body_fat_percent);
      if (isNaN(bf) || bf < 2 || bf > 60) {
        return NextResponse.json({ error: "Nieprawidlowy % tkanki tluszczowej (2-60)" }, { status: 400 });
      }
    }

    const { data, error } = await supabase
      .from("body_measurements")
      .insert({
        profile_id: user.id,
        date: date || new Date().toISOString().substring(0, 10),
        weight_kg: weight,
        body_fat_percent: body_fat_percent || null,
        notes: typeof notes === "string" ? notes.substring(0, 500) : null,
      })
      .select()
      .single();

    if (error) {
      console.error("Measurement insert error:", error);
      return NextResponse.json({ error: "Blad zapisu pomiaru" }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Measurement POST error:", error);
    return NextResponse.json({ error: "Blad zapisu pomiaru" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nie zalogowany" }, { status: 401 });
  }

  const rl = rateLimit(user.id, "measurements", RATE_LIMITS.measurements);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Zbyt wiele zapytan. Sprobuj za ${rl.retryAfter}s.` },
      { status: 429, headers: rateLimitHeaders(rl) }
    );
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Brak id" }, { status: 400 });
  }

  const { error } = await supabase
    .from("body_measurements")
    .delete()
    .eq("id", id)
    .eq("profile_id", user.id);

  if (error) {
    console.error("Measurement delete error:", error);
    return NextResponse.json({ error: "Blad usuwania pomiaru" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
