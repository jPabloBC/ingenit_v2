import { NextResponse } from "next/server";

export async function GET() {
	try {
		const refreshToken = process.env.DROPBOX_REFRESH_TOKEN;
		const clientId = process.env.DROPBOX_CLIENT_ID;
		const clientSecret = process.env.DROPBOX_CLIENT_SECRET;
		if (!refreshToken || !clientId || !clientSecret) {
			return NextResponse.json(
				{ error: "Dropbox env vars are missing" },
				{ status: 500 },
			);
		}

		const params = new URLSearchParams({
			refresh_token: refreshToken,
			grant_type: "refresh_token",
		});

		const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString(
			"base64",
		);

		const response = await fetch("https://api.dropbox.com/oauth2/token", {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				Authorization: `Basic ${basicAuth}`,
			},
			body: params.toString(),
		});

		const data = await response.json();

		if (!response.ok) {
			console.error("❌ Error renovando token de Dropbox:", data);
			return NextResponse.json(
				{ error: data.error_description || "Dropbox token refresh failed" },
				{ status: 400 },
			);
		}

		console.log("✅ Token de Dropbox renovado exitosamente");
		return NextResponse.json({ access_token: data.access_token });
	} catch (error) {
		console.error("❌ Error en API de token de Dropbox:", error);
		return NextResponse.json(
			{ error: "Failed to refresh Dropbox token" },
			{ status: 500 },
		);
	}
}
