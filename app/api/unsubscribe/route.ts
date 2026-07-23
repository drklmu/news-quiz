import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../supabaseAdmin";

export async function POST(request: Request) {
    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { token } = body ?? {};
    if (typeof token !== "string" || token.length < 10) {
        return NextResponse.json({ error: "Invalid unsubscribe link" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
        .from("subscribers")
        .update({ wants_news: false, wants_picture: false })
        .eq("unsub_token", token)
        .select("email");

    if (error) {
        console.error("Unsubscribe failed:", error);
        return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }

    if (!data || data.length === 0) {
        return NextResponse.json({ error: "This unsubscribe link is not valid." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
}