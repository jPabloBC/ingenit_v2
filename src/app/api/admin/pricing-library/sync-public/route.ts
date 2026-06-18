import { NextResponse } from "next/server";
import { syncPublicPricingFeed } from "@/lib/publicPricingSync";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
	try {
		const authHeader = request.headers.get("authorization") || "";
		const expectedToken = process.env.PRICING_SYNC_TOKEN;
		if (expectedToken) {
			const token = authHeader.replace(/^Bearer\s+/i, "").trim();
			if (token !== expectedToken) {
				return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
			}
		}

		const body = (await request.json().catch(() => ({}))) as { feedUrl?: string };
		const feedUrl = body.feedUrl || process.env.PUBLIC_PRICING_FEED_URL;
		if (!feedUrl) {
			return NextResponse.json(
				{
					error:
						"Missing feed URL. Send { feedUrl } or set PUBLIC_PRICING_FEED_URL",
				},
				{ status: 400 },
			);
		}

		const result = await syncPublicPricingFeed(feedUrl);
		return NextResponse.json({ ok: true, ...result });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}

