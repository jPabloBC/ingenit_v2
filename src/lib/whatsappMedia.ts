import { createClient } from "@supabase/supabase-js";

async function fetchWithFallbacks(
	url: string,
	accessToken: string,
): Promise<Response> {
	const headersBase: Record<string, string> = { Accept: "*/*" };

	// 1) As-is (importante para URLs firmadas de lookaside)
	let res = await fetch(url, {
		headers: headersBase,
		redirect: "follow",
	});
	if (res.ok) return res;

	// 2) Retry con Authorization Bearer
	if (accessToken) {
		res = await fetch(url, {
			headers: { ...headersBase, Authorization: `Bearer ${accessToken}` },
			redirect: "follow",
		});
		if (res.ok) return res;
	}

	// 3) Retry agregando access_token como query (si no existe)
	if (accessToken) {
		try {
			const u = new URL(url);
			if (!u.searchParams.get("access_token")) {
				u.searchParams.set("access_token", accessToken);
				res = await fetch(u.toString(), {
					headers: headersBase,
					redirect: "follow",
				});
				if (res.ok) return res;
			}
		} catch {
			// ignore invalid URL
		}
	}

	return res;
}

export async function downloadAndUploadMedia({
	mediaUrl,
	mediaId,
	type,
	contactNumber,
	supabaseUrl,
	supabaseServiceKey,
	accessToken,
}: {
	mediaUrl: string;
	mediaId: string;
	type: "audio" | "video" | "image" | "document";
	contactNumber: string;
	supabaseUrl: string;
	supabaseServiceKey: string;
	accessToken: string;
}): Promise<string | null> {
	try {
		const parsed = new URL(mediaUrl);
		const isGraph = parsed.hostname.includes("graph.facebook.com");
		const isLookaside = parsed.hostname.includes("lookaside.fbsbx.com");
		let downloadUrl = mediaUrl;

		// Paso 1: si viene nodo graph media-id, resolver metadata -> url firmada.
		if (isGraph) {
			const metaRes = await fetchWithFallbacks(mediaUrl, accessToken);
			if (!metaRes.ok) {
				const text = await metaRes.text().catch(() => "");
				throw new Error(
					`No se pudo obtener metadata de media: ${metaRes.status} ${text}`,
				);
			}
			const metaJson = (await metaRes.json().catch(() => null)) as {
				url?: string;
			} | null;
			const resolvedUrl = typeof metaJson?.url === "string" ? metaJson.url : "";
			if (!resolvedUrl) {
				throw new Error("No se encontró campo url en la metadata del media");
			}
			downloadUrl = resolvedUrl;
		} else if (!isLookaside) {
			// Para hosts no esperados usamos la URL tal como llega.
			downloadUrl = mediaUrl;
		}

		// Paso 2: Descargar el binario desde la URL retornada por Graph
		const fileRes = await fetchWithFallbacks(downloadUrl, accessToken);
		if (!fileRes.ok) {
			const txt = await fileRes.text().catch(() => "");
			throw new Error(
				`No se pudo descargar el binario: ${fileRes.status} ${txt}`,
			);
		}

		// Obtener blob/arrayBuffer y content-type
		const arrayBuffer = await fileRes.arrayBuffer();
		const contentType = fileRes.headers.get("content-type") || undefined;
		const fileBody = new Uint8Array(arrayBuffer);

		// Determinar extensión preferente por content-type
		const extFromType = (() => {
			if (!contentType) return null;
			if (contentType.includes("audio/"))
				return contentType.split("/")[1].split("+")[0];
			if (contentType.includes("video/"))
				return contentType.split("/")[1].split("+")[0];
			if (contentType.includes("image/"))
				return contentType.split("/")[1].split("+")[0];
			if (contentType === "application/pdf") return "pdf";
			return null;
		})();

		const extMap: Record<string, string> = {
			audio: "ogg",
			video: "mp4",
			image: "jpg",
			document: "pdf",
		};
		const defaultExt = extMap[type] || "bin";
		const ext = extFromType || defaultExt;
		const folder = type === "document" ? "file" : type;

		// Estructura: whatsapp-media/+(numero de contacto)/(audio|video|file)/mediaId.ext
		const filePath = `whatsapp-media/${contactNumber}/${folder}/${mediaId}.${ext}`;

		// Subir a Supabase Storage en el bucket 'ingenit' usando la service key
		const supabase = createClient(supabaseUrl, supabaseServiceKey);
		const { error } = await supabase.storage
			.from("ingenit")
			.upload(filePath, fileBody, {
				upsert: true,
				contentType: contentType || undefined,
			});
		if (error) throw error;
		return filePath;
	} catch (e) {
		console.error("Error en downloadAndUploadMedia:", e);
		return null;
	}
}
