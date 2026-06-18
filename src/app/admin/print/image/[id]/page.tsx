"use client";
import clsx from "classnames";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { ArrowLeft, ChevronDown, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { deleteFile, uploadImage } from "@/lib/dropboxClient";
import { getPrintJob } from "@/lib/printJobs";
import { deleteFileRecord, saveFileRecord } from "@/lib/rtStorage";

// Solo para mostrar el correlativo sin PRINT_
function cleanCorrelativo(name?: string) {
	return name?.replace(/^PRINT_/, "") || "";
}

// Tamaños de hoja en mm (A4, Carta, etc.)
const PAGE_SIZES = {
	Letter: { label: "Carta (216x279mm)", width: 216, height: 279 },
	Legal: { label: "Legal (216x330mm)", width: 216, height: 330 },
	A4: { label: "A4 (210x297mm)", width: 210, height: 297 },
};
// Factor para mostrar el preview en pantalla (px por mm)
const PREVIEW_SCALE = 3.5;
const PT_TO_MM = 0.352778;
const BORDER_PT_PRESETS = ["0", "0.5", "1", "1.5", "2", "3", "4", "6", "8"];
const RADIUS_PRESETS = [
	{ value: 0, label: "Sin redondeo" },
	{ value: 2, label: "Suave" },
	{ value: 6, label: "Medio" },
	{ value: 12, label: "Alto" },
	{ value: 20, label: "Máximo" },
];

type ImageSetting = {
	repeatCount: number;
	spanCols: number;
	spanRows: number;
	fitMode?: "contain" | "cover" | "stretch";
	customWidth?: number | null;
	customHeight?: number | null;
};

const defaultImageSetting = (): ImageSetting => ({
	repeatCount: 1,
	spanCols: 1,
	spanRows: 1,
	fitMode: "contain",
	customWidth: null,
	customHeight: null,
});

type DragState = {
	cellKey: string;
	startClientX: number;
	startClientY: number;
	originOffsetX: number;
	originOffsetY: number;
	minOffsetX: number;
	maxOffsetX: number;
	minOffsetY: number;
	maxOffsetY: number;
};

function getErrorMessage(error: unknown): string {
	if (error instanceof Error) return error.message;
	return String(error);
}

const IMAGE_EXTENSIONS = new Set([
	"jpg",
	"jpeg",
	"png",
	"gif",
	"webp",
	"bmp",
	"svg",
	"avif",
	"tif",
	"tiff",
]);

function getExtension(name?: string | null): string {
	if (!name) return "";
	const normalized = name.split("?")[0].split("#")[0];
	const idx = normalized.lastIndexOf(".");
	if (idx < 0) return "";
	return normalized.slice(idx + 1).toLowerCase();
}

function isImageLike(file: {
	file_type?: string | null;
	file_name?: string | null;
	path?: string | null;
}) {
	const mime = (file.file_type || "").toLowerCase();
	if (mime.startsWith("image/")) return true;
	const ext = getExtension(file.file_name) || getExtension(file.path);
	return IMAGE_EXTENSIONS.has(ext);
}

function isPdfLike(file: {
	file_type?: string | null;
	file_name?: string | null;
	path?: string | null;
}) {
	const mime = (file.file_type || "").toLowerCase();
	if (mime === "application/pdf") return true;
	const ext = getExtension(file.file_name) || getExtension(file.path);
	return ext === "pdf";
}

function useContainerWidth(ref: React.RefObject<HTMLElement | null>) {
	const [width, setWidth] = useState<number>(0);

	useEffect(() => {
		if (!ref.current) return;

		const observer = new ResizeObserver((entries) => {
			for (const entry of entries) {
				setWidth(entry.contentRect.width);
			}
		});

		observer.observe(ref.current);
		return () => observer.disconnect();
	}, [ref]);

	return width;
}

export default function PrintJobDetailPage() {
	const router = useRouter();
	const params = useParams();
	const jobId = params?.id as string;

	const [job, setJob] = useState<{ name?: string } | null>(null);
	const [images, setImages] = useState<File[]>([]);
	const [uploaded, setUploaded] = useState<
		{
			id: string;
			path: string;
			url: string;
			file_name: string;
			file_type: string;
		}[]
	>([]);
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const [printing, setPrinting] = useState(false);
	const [printJobId, setPrintJobId] = useState<string | null>(null);

	// Editor de preview
	const [pageSize, setPageSize] = useState<keyof typeof PAGE_SIZES>("Letter");
	const [pageOrientation, setPageOrientation] = useState<
		"portrait" | "landscape"
	>("portrait");
	const [gap, setGap] = useState(2);
	const [margin, setMargin] = useState(5); // Margen del lienzo en mm
	const [containerRadiusMm, setContainerRadiusMm] = useState(0);
	const [containerBorderWidthMm, setContainerBorderWidthMm] = useState(0.3);
	const [containerBorderColor, setContainerBorderColor] = useState("#d1d5db");
	const [contentWidthPercent, setContentWidthPercent] = useState(100);
	const [contentHeightPercent, setContentHeightPercent] = useState(100);

	// Manual grid size (null = auto)
	const [manualCols, setManualCols] = useState<number | null>(null);
	const [manualRows, setManualRows] = useState<number | null>(null);

	const previewRef = useRef<HTMLDivElement | null>(null);
	const containerRef = useRef<HTMLDivElement | null>(null);
	const containerWidth = useContainerWidth(containerRef);

	// Per-image controls: repeatCount (veces que aparece), spanCols, spanRows (tamaño relativo), customWidth/customHeight
	const [imageSettings, setImageSettings] = useState<
		Record<number, ImageSetting>
	>({});
	const [sizeUnit, setSizeUnit] = useState<"cm" | "in">("cm");
	const [manualMoveEnabled, setManualMoveEnabled] = useState(false);
	const [borderPanelOpen, setBorderPanelOpen] = useState(true);
	const [cellOffsets, setCellOffsets] = useState<
		Record<string, { x: number; y: number }>
	>({});
	const dragRef = useRef<DragState | null>(null);

	// Drag and drop state
	const [isDragOver, setIsDragOver] = useState(false);

	// Track window width for responsive scaling
	const [_windowWidth, setWindowWidth] = useState(
		typeof window !== "undefined" ? window.innerWidth : 1000,
	);

	useEffect(() => {
		const handleResize = () => setWindowWidth(window.innerWidth);
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	// Calcular layout automático basado en cantidad de imágenes y sus repeticiones
	const layoutConfig = useMemo(() => {
		const cells: { imgIdx: number; spanCols: number; spanRows: number }[] = [];

		// Por cada imagen, agregar tantas celdas como su repeatCount
		uploaded.forEach((_, imgIdx) => {
			const settings = imageSettings[imgIdx] || defaultImageSetting();
			for (let i = 0; i < settings.repeatCount; i++) {
				cells.push({
					imgIdx,
					spanCols: settings.spanCols,
					spanRows: settings.spanRows,
				});
			}
		});

		const totalCells = cells.length;
		let cols: number;
		let rows: number;

		// Calcular layout automático base
		if (totalCells === 0) {
			cols = 1;
			rows = 1;
		} else if (totalCells === 1) {
			const cell = cells[0];
			cols = Math.max(1, cell.spanCols);
			rows = Math.max(1, cell.spanRows);
		} else {
			const baseSize = Math.ceil(Math.sqrt(totalCells));
			cols = baseSize;
			rows = baseSize;

			const maxSpanCols = Math.max(...cells.map((c) => c.spanCols));
			const maxSpanRows = Math.max(...cells.map((c) => c.spanRows));

			cols = Math.max(cols, maxSpanCols);
			rows = Math.max(rows, maxSpanRows);

			while (cols * rows < totalCells) {
				if (cols <= rows) {
					cols++;
				} else {
					rows++;
				}
			}
		}

		// Sobrescribir con valores manuales si existen (independientes)
		if (manualCols !== null) cols = manualCols;
		if (manualRows !== null) rows = manualRows;

		return { cells, cols, rows };
	}, [uploaded, imageSettings, manualCols, manualRows]);

	const orientedPage = useMemo(() => {
		const base = PAGE_SIZES[pageSize];
		const shortSide = Math.min(base.width, base.height);
		const longSide = Math.max(base.width, base.height);
		return pageOrientation === "portrait"
			? { width: shortSide, height: longSide, orientation: "portrait" as const }
			: {
					width: longSide,
					height: shortSide,
					orientation: "landscape" as const,
				};
	}, [pageSize, pageOrientation]);

	useEffect(() => {
		if (!jobId) return;
		const fetchJob = async () => {
			try {
				const data = await getPrintJob(jobId);
				setJob(data);
			} catch (err: unknown) {
				setError(`Error cargando documento: ${getErrorMessage(err)}`);
			}
		};
		fetchJob();
	}, [jobId]);

	useEffect(() => {
		if (!jobId) return;
		let cancelled = false;
		const fetchFiles = async () => {
			setLoading(true);
			try {
				const res = await fetch(
					`/api/print-job-files?jobId=${encodeURIComponent(jobId)}`,
				);
				const json = await res.json();
				if (!res.ok) throw new Error(json?.error || "Error fetching files");
				if (!cancelled) setUploaded(json.files || []);
			} catch (err: unknown) {
				if (!cancelled)
					setError(`Error cargando archivos: ${getErrorMessage(err)}`);
			} finally {
				if (!cancelled) setLoading(false);
			}
		};
		fetchFiles();
		return () => {
			cancelled = true;
		};
	}, [jobId]);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files ? Array.from(e.target.files) : [];
		setImages(files);
	};

	const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragOver(false);

		const files = e.dataTransfer.files;
		if (files && files.length > 0) {
			setImages(
				Array.from(files).filter(
					(f) => {
						const mime = (f.type || "").toLowerCase();
						if (mime.startsWith("image/") || mime === "application/pdf") {
							return true;
						}
						const ext = getExtension(f.name);
						return IMAGE_EXTENSIONS.has(ext) || ext === "pdf";
					},
				),
			);
		}
	};

	const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragOver(true);
	};

	const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragOver(false);
	};

	const handleUpload = async () => {
		setError("");
		setLoading(true);
		try {
			if (images.length === 0) {
				setError("Debes seleccionar al menos un archivo.");
				setLoading(false);
				return;
			}
			for (const file of images) {
				const dropboxPath = `/print_jobs/${jobId}/${Date.now()}_${file.name}`;
				await uploadImage(file, dropboxPath);
				const _record = await saveFileRecord({
					dropbox_path: dropboxPath,
					file_name: file.name,
					file_type: file.type,
					metadata: { print_job_id: jobId },
				});
				// No temporary link client-side (use server API to get temp links). We'll refresh the list after uploads.
			}
			setImages([]);
			// Refresh uploaded list from server
			try {
				const res = await fetch(
					`/api/print-job-files?jobId=${encodeURIComponent(jobId)}`,
				);
				const json = await res.json();
				if (res.ok) {
					setUploaded(json.files || []);
				}
			} catch (_e) {
				// ignore refresh errors here; next effect or manual reload will recover
			}
		} catch (err: unknown) {
			setError(`Error subiendo archivo: ${getErrorMessage(err)}`);
		} finally {
			setLoading(false);
		}
	};

	const handleDelete = async (id: string, path: string) => {
		setLoading(true);
		try {
			await deleteFile(path);
			await deleteFileRecord(id);
			setUploaded(uploaded.filter((img) => img.id !== id));
		} catch (err: unknown) {
			setError(`Error eliminando archivo: ${getErrorMessage(err)}`);
		} finally {
			setLoading(false);
		}
	};

	const waitForImages = (root: HTMLElement) => {
		const imgs = Array.from(root.querySelectorAll("img")) as HTMLImageElement[];
		return Promise.all(
			imgs.map((img) => {
				if (img.complete && img.naturalWidth !== 0) return Promise.resolve();
				return new Promise<void>((resolve) => {
					const onLoad = () => {
						cleanup();
						resolve();
					};
					const onErr = () => {
						cleanup();
						resolve();
					};
					const cleanup = () => {
						img.removeEventListener("load", onLoad);
						img.removeEventListener("error", onErr);
					};
					img.addEventListener("load", onLoad);
					img.addEventListener("error", onErr);
				});
			}),
		);
	};

	const generatePdfBlob = async (): Promise<{
		blob: Blob;
		pdf: jsPDF;
	} | null> => {
		setError("");
		if (!previewRef.current) {
			setError("No hay vista previa para exportar.");
			return null;
		}
		try {
			if (typeof document !== "undefined" && "fonts" in document) {
				await (document as Document & { fonts?: { ready?: Promise<unknown> } })
					.fonts?.ready;
			}
		} catch {
			// ignore font readiness issues and continue
		}

		// Clonamos el preview para exportar sin depender de transform/escala responsive del viewport.
		const exportNode = previewRef.current.cloneNode(true) as HTMLDivElement;
		exportNode.style.position = "fixed";
		exportNode.style.left = "-100000px";
		exportNode.style.top = "0";
		exportNode.style.transform = "none";
		exportNode.style.margin = "0";
		exportNode.style.boxShadow = "none";
		exportNode.style.width = `${orientedPage.width * PREVIEW_SCALE}px`;
		exportNode.style.height = `${orientedPage.height * PREVIEW_SCALE}px`;
		document.body.appendChild(exportNode);

		await waitForImages(exportNode);
		const canvas = await html2canvas(exportNode, {
			scale: 2,
			useCORS: true,
			allowTaint: false,
			backgroundColor: "#ffffff",
			logging: false,
		});
		document.body.removeChild(exportNode);

		const imgData = canvas.toDataURL("image/png");
		const pdf = new jsPDF({
			unit: "mm",
			format: [orientedPage.width, orientedPage.height],
			orientation: orientedPage.orientation,
		});
		pdf.addImage(
			imgData,
			"PNG",
			0,
			0,
			orientedPage.width,
			orientedPage.height,
			undefined,
			"FAST",
		);
		const blob = pdf.output("blob");
		return { blob, pdf };
	};

	const handleExportPDF = async () => {
		try {
			const res = await generatePdfBlob();
			if (!res) return;
			const { pdf } = res;
			const filename = `${(job?.name || jobId).replace(/[^a-z0-9.\-_]/gi, "_")}.pdf`;
			// Trigger download
			pdf.save(filename);
			// Also return blob URL (optional, not necessary)
		} catch (err: unknown) {
			setError(`Error exportando PDF: ${getErrorMessage(err)}`);
		}
	};

	const handleOpenPDF = async () => {
		try {
			const res = await generatePdfBlob();
			if (!res) return;
			const { blob } = res;
			const url = URL.createObjectURL(blob);
			window.open(url, "_blank");
		} catch (err: unknown) {
			setError(`Error generando PDF: ${getErrorMessage(err)}`);
		}
	};

	// Calculate scale based on container width
	const baseWidth = orientedPage.width * PREVIEW_SCALE;
	const baseHeight = orientedPage.height * PREVIEW_SCALE;
	const scale = containerWidth
		? Math.min(1, (containerWidth - 32) / baseWidth)
		: 1;
	const _scaledHeight = baseHeight * scale;
	const containerRadiusPx = containerRadiusMm * PREVIEW_SCALE;
	const containerBorderWidthPx = containerBorderWidthMm * PREVIEW_SCALE;
	const borderWidthPt = containerBorderWidthMm / PT_TO_MM;

	useEffect(() => {
		const onPointerMove = (e: PointerEvent) => {
			const drag = dragRef.current;
			if (!drag) return;
			const safeScale = scale || 1;
			const deltaX = (e.clientX - drag.startClientX) / safeScale;
			const deltaY = (e.clientY - drag.startClientY) / safeScale;
			const rawX = drag.originOffsetX + deltaX;
			const rawY = drag.originOffsetY + deltaY;
			const nextX = Math.min(Math.max(rawX, drag.minOffsetX), drag.maxOffsetX);
			const nextY = Math.min(Math.max(rawY, drag.minOffsetY), drag.maxOffsetY);
			setCellOffsets((prev) => ({
				...prev,
				[drag.cellKey]: { x: nextX, y: nextY },
			}));
		};

		const onPointerUp = () => {
			dragRef.current = null;
		};

		window.addEventListener("pointermove", onPointerMove);
		window.addEventListener("pointerup", onPointerUp);
		window.addEventListener("pointercancel", onPointerUp);

		return () => {
			window.removeEventListener("pointermove", onPointerMove);
			window.removeEventListener("pointerup", onPointerUp);
			window.removeEventListener("pointercancel", onPointerUp);
		};
	}, [scale]);

	return (
		<div className="w-full min-h-screen bg-white p-0 m-0 overflow-x-hidden">
			<div className="w-full py-4 px-2 sm:py-6 sm:px-4 md:px-6 lg:px-6 xl:px-8">
				<div className="mb-3 sm:mb-4 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm">
					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={() => router.push("/admin/print/image")}
							className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300"
							aria-label="Volver a documentos"
							title="Volver a documentos"
						>
							<ArrowLeft className="w-5 h-5" />
						</button>
						<h1 className="text-lg sm:text-xl font-semibold break-words text-gray-800">
							Documento:{" "}
							{job?.name ? (
								<>
									<span className="text-blue-700 ml-1">
										{cleanCorrelativo(job.name)}
									</span>
									<span className="ml-2 text-xs sm:text-sm text-gray-400 break-all">
										ID: {jobId?.split("-")[0]}
									</span>
								</>
							) : (
								<span className="text-gray-400 ml-1">...</span>
							)}
						</h1>
					</div>
				</div>
				{/* ...eliminado debug de archivos subidos... */}
				{/* Preview de hoja editable */}
				<div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] 2xl:grid-cols-[minmax(0,1fr)_480px] gap-4 w-full">
					{/* Preview canvas a la izquierda */}
					<div
						className="flex-1 w-full flex items-start justify-center rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
						ref={containerRef}
					>
						<div
							className="relative mx-auto"
							style={{
								width: Math.min(baseWidth * scale, containerWidth - 32),
								height: baseHeight * scale,
							}}
						>
							<div
								className="origin-top-left"
								style={{
									width: baseWidth,
									height: baseHeight,
									transform: `scale(${scale})`,
								}}
							>
								<div
									ref={previewRef}
									className="bg-gray-100 border border-gray-300 relative shadow"
									style={{
										width: baseWidth,
										height: baseHeight,
										position: "relative",
										overflow: "hidden",
									}}
								>
									{/* Renderizar grilla de imágenes */}
									{(() => {
										const { cells, cols, rows } = layoutConfig;
										const marginPx = margin * PREVIEW_SCALE;
										const pageWidthPx = orientedPage.width * PREVIEW_SCALE;
										const pageHeightPx = orientedPage.height * PREVIEW_SCALE;
										const availableWidth = pageWidthPx - marginPx * 2;
										const availableHeight = pageHeightPx - marginPx * 2;
										const usableWidth =
											availableWidth * (contentWidthPercent / 100);
										const usableHeight =
											availableHeight * (contentHeightPercent / 100);
										const areaStartLeft =
											marginPx + (availableWidth - usableWidth) / 2;
										const areaStartTop =
											marginPx + (availableHeight - usableHeight) / 2;
										const gapPx = gap * PREVIEW_SCALE;
										const totalGapX = gapPx * (cols - 1);
										const totalGapY = gapPx * (rows - 1);
										const cellW = Math.max(1, (usableWidth - totalGapX) / cols);
										const cellH = Math.max(
											1,
											(usableHeight - totalGapY) / rows,
										);
										const unitToMm = sizeUnit === "cm" ? 10 : 25.4;

										// Construir grid de posiciones ocupadas
										const grid: boolean[][] = Array.from({ length: rows }, () =>
											Array(cols).fill(false),
										);
										const renderedCells: React.ReactElement[] = [
											<div
												key="content-area-guide"
												className="absolute border border-dashed border-blue-300/70 pointer-events-none"
												style={{
													left: areaStartLeft,
													top: areaStartTop,
													width: usableWidth,
													height: usableHeight,
												}}
											/>,
										];

										let cellIndex = 0;
										for (
											let row = 0;
											row < rows && cellIndex < cells.length;
											row++
										) {
											for (
												let col = 0;
												col < cols && cellIndex < cells.length;
												col++
											) {
												if (grid[row][col]) continue; // Ya ocupada

												const cell = cells[cellIndex];
												const file = uploaded[cell.imgIdx];
												if (!file) {
													cellIndex++;
													continue;
												}

												// Verificar si el span cabe
												let fits = true;
												for (let dr = 0; dr < cell.spanRows && fits; dr++) {
													for (let dc = 0; dc < cell.spanCols && fits; dc++) {
														if (
															row + dr >= rows ||
															col + dc >= cols ||
															grid[row + dr][col + dc]
														) {
															fits = false;
														}
													}
												}

												if (!fits) {
													// No cabe con span, usar 1x1
													grid[row][col] = true;
													const left = areaStartLeft + col * (cellW + gapPx);
													const top = areaStartTop + row * (cellH + gapPx);
													const cellSettings =
														imageSettings[cell.imgIdx] || defaultImageSetting();
													const customWidthPx =
														cellSettings.customWidth &&
														cellSettings.customWidth > 0
															? cellSettings.customWidth *
																unitToMm *
																PREVIEW_SCALE
															: null;
													const customHeightPx =
														cellSettings.customHeight &&
														cellSettings.customHeight > 0
															? cellSettings.customHeight *
																unitToMm *
																PREVIEW_SCALE
															: null;
													const finalWidth = Math.min(
														customWidthPx ?? cellW,
														availableWidth,
													);
													const finalHeight = Math.min(
														customHeightPx ?? cellH,
														availableHeight,
													);
													const centeredLeft = left + (cellW - finalWidth) / 2;
													const centeredTop = top + (cellH - finalHeight) / 2;
													const adjustedLeft = Math.min(
														Math.max(centeredLeft, marginPx),
														marginPx + availableWidth - finalWidth,
													);
													const adjustedTop = Math.min(
														Math.max(centeredTop, marginPx),
														marginPx + availableHeight - finalHeight,
													);

													const cellKey = `${file.id}-${row}-${col}`;
													const currentOffset = cellOffsets[cellKey] || {
														x: 0,
														y: 0,
													};
													const minOffsetX = marginPx - adjustedLeft;
													const maxOffsetX =
														marginPx +
														availableWidth -
														finalWidth -
														adjustedLeft;
													const minOffsetY = marginPx - adjustedTop;
													const maxOffsetY =
														marginPx +
														availableHeight -
														finalHeight -
														adjustedTop;
													const moveX = Math.min(
														Math.max(currentOffset.x, minOffsetX),
														maxOffsetX,
													);
													const moveY = Math.min(
														Math.max(currentOffset.y, minOffsetY),
														maxOffsetY,
													);
													const finalLeft = adjustedLeft + moveX;
													const finalTop = adjustedTop + moveY;

													renderedCells.push(
														<div
															key={cellKey}
															className={`absolute bg-white flex items-center justify-center overflow-hidden shadow-sm ${
																manualMoveEnabled
																	? "cursor-move select-none"
																	: ""
															}`}
															style={{
																left: finalLeft,
																top: finalTop,
																width: finalWidth,
																height: finalHeight,
																borderRadius: containerRadiusPx,
																borderStyle: "solid",
																borderWidth: containerBorderWidthPx,
																borderColor: containerBorderColor,
															}}
															onPointerDown={
																manualMoveEnabled
																	? (e) => {
																			e.preventDefault();
																			const existing = cellOffsets[cellKey] || {
																				x: 0,
																				y: 0,
																			};
																			dragRef.current = {
																				cellKey,
																				startClientX: e.clientX,
																				startClientY: e.clientY,
																				originOffsetX: existing.x,
																				originOffsetY: existing.y,
																				minOffsetX,
																				maxOffsetX,
																				minOffsetY,
																				maxOffsetY,
																			};
																		}
																	: undefined
															}
														>
															{isImageLike(file) ? (
																file.url ? (
																	<Image
																		src={file.url}
																		alt={file.file_name}
																		unoptimized
																		width={800}
																		height={800}
																		style={
																			imageSettings[cell.imgIdx]?.fitMode ===
																			"cover"
																				? {
																						width: "100%",
																						height: "100%",
																						objectFit: "cover",
																					}
																				: imageSettings[cell.imgIdx]
																							?.fitMode === "stretch"
																					? {
																							width: "100%",
																							height: "100%",
																							objectFit: "fill",
																						}
																					: {
																							width: "100%",
																							height: "100%",
																							objectFit: "contain",
																						}
																		}
																	/>
																) : (
																	<div className="text-xs text-gray-500">
																		Imagen no disponible
																	</div>
																)
															) : isPdfLike(file) ? (
																<span className="text-xs text-gray-500">
																	PDF
																</span>
															) : (
																<span className="text-xs text-gray-500">
																	Archivo
																</span>
															)}
														</div>,
													);
												} else {
													// Marcar celdas ocupadas
													for (let dr = 0; dr < cell.spanRows; dr++) {
														for (let dc = 0; dc < cell.spanCols; dc++) {
															grid[row + dr][col + dc] = true;
														}
													}

													const left = areaStartLeft + col * (cellW + gapPx);
													const top = areaStartTop + row * (cellH + gapPx);
													const width =
														cellW * cell.spanCols + gapPx * (cell.spanCols - 1);
													const height =
														cellH * cell.spanRows + gapPx * (cell.spanRows - 1);
													const cellSettings =
														imageSettings[cell.imgIdx] || defaultImageSetting();
													const customWidthPx =
														cellSettings.customWidth &&
														cellSettings.customWidth > 0
															? cellSettings.customWidth *
																unitToMm *
																PREVIEW_SCALE
															: null;
													const customHeightPx =
														cellSettings.customHeight &&
														cellSettings.customHeight > 0
															? cellSettings.customHeight *
																unitToMm *
																PREVIEW_SCALE
															: null;
													const finalWidth = Math.min(
														customWidthPx ?? width,
														availableWidth,
													);
													const finalHeight = Math.min(
														customHeightPx ?? height,
														availableHeight,
													);
													const centeredLeft = left + (width - finalWidth) / 2;
													const centeredTop = top + (height - finalHeight) / 2;
													const adjustedLeft = Math.min(
														Math.max(centeredLeft, marginPx),
														marginPx + availableWidth - finalWidth,
													);
													const adjustedTop = Math.min(
														Math.max(centeredTop, marginPx),
														marginPx + availableHeight - finalHeight,
													);

													const cellKey = `${file.id}-${row}-${col}`;
													const currentOffset = cellOffsets[cellKey] || {
														x: 0,
														y: 0,
													};
													const minOffsetX = marginPx - adjustedLeft;
													const maxOffsetX =
														marginPx +
														availableWidth -
														finalWidth -
														adjustedLeft;
													const minOffsetY = marginPx - adjustedTop;
													const maxOffsetY =
														marginPx +
														availableHeight -
														finalHeight -
														adjustedTop;
													const moveX = Math.min(
														Math.max(currentOffset.x, minOffsetX),
														maxOffsetX,
													);
													const moveY = Math.min(
														Math.max(currentOffset.y, minOffsetY),
														maxOffsetY,
													);
													const finalLeft = adjustedLeft + moveX;
													const finalTop = adjustedTop + moveY;

													renderedCells.push(
														<div
															key={cellKey}
															className={`absolute bg-white flex items-center justify-center overflow-hidden shadow-sm ${
																manualMoveEnabled
																	? "cursor-move select-none"
																	: ""
															}`}
															style={{
																left: finalLeft,
																top: finalTop,
																width: finalWidth,
																height: finalHeight,
																borderRadius: containerRadiusPx,
																borderStyle: "solid",
																borderWidth: containerBorderWidthPx,
																borderColor: containerBorderColor,
															}}
															onPointerDown={
																manualMoveEnabled
																	? (e) => {
																			e.preventDefault();
																			const existing = cellOffsets[cellKey] || {
																				x: 0,
																				y: 0,
																			};
																			dragRef.current = {
																				cellKey,
																				startClientX: e.clientX,
																				startClientY: e.clientY,
																				originOffsetX: existing.x,
																				originOffsetY: existing.y,
																				minOffsetX,
																				maxOffsetX,
																				minOffsetY,
																				maxOffsetY,
																			};
																		}
																	: undefined
															}
														>
															{isImageLike(file) ? (
																file.url ? (
																	<Image
																		src={file.url}
																		alt={file.file_name}
																		unoptimized
																		width={800}
																		height={800}
																		style={
																			imageSettings[cell.imgIdx]?.fitMode ===
																			"cover"
																				? {
																						width: "100%",
																						height: "100%",
																						objectFit: "cover",
																					}
																				: imageSettings[cell.imgIdx]
																							?.fitMode === "stretch"
																					? {
																							width: "100%",
																							height: "100%",
																							objectFit: "fill",
																						}
																					: {
																							width: "100%",
																							height: "100%",
																							objectFit: "contain",
																						}
																		}
																	/>
																) : (
																	<div className="text-xs text-gray-500">
																		Imagen no disponible
																	</div>
																)
															) : isPdfLike(file) ? (
																<span className="text-xs text-gray-500">
																	PDF
																</span>
															) : (
																<span className="text-xs text-gray-500">
																	Archivo
																</span>
															)}
														</div>,
													);
												}

												cellIndex++;
											}
										}

										return renderedCells;
									})()}
								</div>
							</div>
						</div>
					</div>
					{/* Panel de subida y lista de imágenes a la derecha */}
					<div className="w-full min-w-0 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
						<div className="mb-4">
							<div className="grid grid-cols-2 gap-2">
								<section className="rounded-md border border-gray-200 bg-gray-50/70 p-3">
									<h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
										Documento
									</h3>
									<div className="space-y-3">
										<div>
											<p className="block text-xs mb-1 text-gray-600">
												Tamaño de hoja
											</p>
											<select
												value={pageSize}
												onChange={(e) =>
													setPageSize(e.target.value as keyof typeof PAGE_SIZES)
												}
												className="border rounded px-2 py-2 w-full text-sm bg-white"
											>
												{Object.entries(PAGE_SIZES).map(([key, val]) => (
													<option key={key} value={key}>
														{val.label}
													</option>
												))}
											</select>
										</div>
										<div>
											<p className="block text-xs mb-1 text-gray-600">
												Orientación
											</p>
											<select
												value={pageOrientation}
												onChange={(e) =>
													setPageOrientation(
														e.target.value as "portrait" | "landscape",
													)
												}
												className="border rounded px-2 py-2 w-full text-sm bg-white"
											>
												<option value="portrait">Vertical</option>
												<option value="landscape">Horizontal</option>
											</select>
										</div>
										<div>
											<p className="block text-xs mb-1 text-gray-600">
												Tamaño personalizado
											</p>
											<select
												value={sizeUnit}
												onChange={(e) =>
													setSizeUnit(e.target.value as "cm" | "in")
												}
												className="border rounded px-2 py-2 w-full text-sm bg-white"
											>
												<option value="cm">Centímetros (cm)</option>
												<option value="in">Pulgadas (in)</option>
											</select>
										</div>
									</div>
								</section>

								<section className="rounded-md border border-gray-200 bg-gray-50/70 p-3">
									<h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
										Layout
									</h3>
									<div className="space-y-3">
										<div className="grid grid-cols-2 gap-2">
											<div>
												<p className="block text-xs mb-1 text-gray-600">
													Espaciado (mm)
												</p>
												<div className="flex items-center rounded overflow-hidden border bg-white">
													<button
														type="button"
														onClick={() => gap > 0 && setGap(gap - 1)}
														className="px-2 py-2 bg-gray-100 hover:bg-gray-200 border-r"
													>
														−
													</button>
													<span className="px-3 py-2 text-sm font-medium min-w-[2.5rem] text-center">
														{gap}
													</span>
													<button
														type="button"
														onClick={() => gap < 20 && setGap(gap + 1)}
														className="px-2 py-2 bg-gray-100 hover:bg-gray-200 border-l"
													>
														+
													</button>
												</div>
											</div>
											<div>
												<p className="block text-xs mb-1 text-gray-600">
													Márgenes (mm)
												</p>
												<div className="flex items-center rounded overflow-hidden border bg-white">
													<button
														type="button"
														onClick={() => margin > 0 && setMargin(margin - 1)}
														className="px-2 py-2 bg-gray-100 hover:bg-gray-200 border-r"
													>
														−
													</button>
													<span className="px-3 py-2 text-sm font-medium min-w-[2.5rem] text-center">
														{margin}
													</span>
													<button
														type="button"
														onClick={() => margin < 50 && setMargin(margin + 1)}
														className="px-2 py-2 bg-gray-100 hover:bg-gray-200 border-l"
													>
														+
													</button>
												</div>
											</div>
										</div>

										<div className="grid grid-cols-2 gap-2">
											<div>
												<p className="block text-xs mb-1 text-gray-600">
													Columnas
												</p>
												<div className="flex items-center rounded overflow-hidden border bg-white">
													<button
														type="button"
														onClick={() => {
															let current = manualCols;
															if (current === null) current = layoutConfig.cols;
															if (current > 1) setManualCols(current - 1);
															else if (
																manualCols === null &&
																layoutConfig.cols > 1
															)
																setManualCols(layoutConfig.cols - 1);
														}}
														className="px-2 py-2 bg-gray-100 hover:bg-gray-200 border-r"
													>
														−
													</button>
													<span className="px-3 py-2 text-sm font-medium min-w-[2.5rem] text-center">
														{manualCols || layoutConfig.cols}
													</span>
													<button
														type="button"
														onClick={() => {
															let current = manualCols;
															if (current === null) current = layoutConfig.cols;
															if (current < 20) setManualCols(current + 1);
															else if (
																manualCols === null &&
																layoutConfig.cols < 20
															)
																setManualCols(layoutConfig.cols + 1);
														}}
														className="px-2 py-2 bg-gray-100 hover:bg-gray-200 border-l"
													>
														+
													</button>
												</div>
											</div>
											<div>
												<p className="block text-xs mb-1 text-gray-600">
													Filas
												</p>
												<div className="flex items-center rounded overflow-hidden border bg-white">
													<button
														type="button"
														onClick={() => {
															let current = manualRows;
															if (current === null) current = layoutConfig.rows;
															if (current > 1) setManualRows(current - 1);
															else if (
																manualRows === null &&
																layoutConfig.rows > 1
															)
																setManualRows(layoutConfig.rows - 1);
														}}
														className="px-2 py-2 bg-gray-100 hover:bg-gray-200 border-r"
													>
														−
													</button>
													<span className="px-3 py-2 text-sm font-medium min-w-[2.5rem] text-center">
														{manualRows || layoutConfig.rows}
													</span>
													<button
														type="button"
														onClick={() => {
															let current = manualRows;
															if (current === null) current = layoutConfig.rows;
															if (current < 20) setManualRows(current + 1);
															else if (
																manualRows === null &&
																layoutConfig.rows < 20
															)
																setManualRows(layoutConfig.rows + 1);
														}}
														className="px-2 py-2 bg-gray-100 hover:bg-gray-200 border-l"
													>
														+
													</button>
												</div>
											</div>
										</div>

										<div className="grid grid-cols-2 gap-2">
											<div>
												<p className="block text-xs mb-1 text-gray-600">
													Área ancho (%)
												</p>
												<div className="flex items-center rounded overflow-hidden border bg-white">
													<button
														type="button"
														onClick={() =>
															setContentWidthPercent((v) => Math.max(30, v - 5))
														}
														className="px-2 py-2 bg-gray-100 hover:bg-gray-200 border-r"
													>
														−
													</button>
													<span className="px-3 py-2 text-sm font-medium min-w-[2.5rem] text-center">
														{contentWidthPercent}
													</span>
													<button
														type="button"
														onClick={() =>
															setContentWidthPercent((v) =>
																Math.min(100, v + 5),
															)
														}
														className="px-2 py-2 bg-gray-100 hover:bg-gray-200 border-l"
													>
														+
													</button>
												</div>
											</div>
											<div>
												<p className="block text-xs mb-1 text-gray-600">
													Área alto (%)
												</p>
												<div className="flex items-center rounded overflow-hidden border bg-white">
													<button
														type="button"
														onClick={() =>
															setContentHeightPercent((v) =>
																Math.max(30, v - 5),
															)
														}
														className="px-2 py-2 bg-gray-100 hover:bg-gray-200 border-r"
													>
														−
													</button>
													<span className="px-3 py-2 text-sm font-medium min-w-[2.5rem] text-center">
														{contentHeightPercent}
													</span>
													<button
														type="button"
														onClick={() =>
															setContentHeightPercent((v) =>
																Math.min(100, v + 5),
															)
														}
														className="px-2 py-2 bg-gray-100 hover:bg-gray-200 border-l"
													>
														+
													</button>
												</div>
											</div>
										</div>

										<div className="grid grid-cols-2 gap-2">
											<button
												type="button"
												onClick={() => {
													setManualCols(null);
													setManualRows(null);
												}}
												className="w-full px-3 py-2 text-xs bg-blue3 hover:bg-blue5 text-white rounded font-medium"
												title="Volver a modo automático"
											>
												Auto grilla
											</button>
											<button
												type="button"
												onClick={() => {
													setContentWidthPercent(100);
													setContentHeightPercent(100);
												}}
												className="w-full px-3 py-2 text-xs bg-blue3 hover:bg-blue5 text-white rounded font-medium"
												title="Restablecer área al 100%"
											>
												Área 100%
											</button>
										</div>
									</div>
								</section>

								<section className="col-span-2 rounded-md border border-gray-200 bg-gray-50/70 p-3">
									<h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
										Elementos
									</h3>
									<div className="space-y-3">
										<div className="rounded-md border border-gray-200 bg-white">
											<button
												type="button"
												onClick={() => setBorderPanelOpen((v) => !v)}
												className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
												aria-expanded={borderPanelOpen}
											>
												<span className="inline-flex items-center gap-2 ml-1">
													<svg
														viewBox="0 0 16 16"
														className="h-4 w-4 text-gray-500"
														fill="none"
														aria-hidden="true"
													>
														<line
															x1="2"
															y1="4"
															x2="14"
															y2="4"
															stroke="currentColor"
															strokeWidth="1"
															strokeLinecap="round"
														/>
														<line
															x1="2"
															y1="8"
															x2="14"
															y2="8"
															stroke="currentColor"
															strokeWidth="2"
															strokeLinecap="round"
														/>
														<line
															x1="2"
															y1="12"
															x2="14"
															y2="12"
															stroke="currentColor"
															strokeWidth="3"
															strokeLinecap="round"
														/>
													</svg>
													Borde
												</span>
												{borderPanelOpen ? (
													<ChevronDown className="h-4 w-4 text-gray-500" />
												) : (
													<ChevronRight className="h-4 w-4 text-gray-500" />
												)}
											</button>
											{borderPanelOpen && (
												<div className="border-t border-gray-200 p-3">
													<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
														<div>
															<p className="block text-xs mb-1 text-gray-600">
																Grosor (pt)
															</p>
															<div className="flex items-center gap-2">
																<div className="relative w-full">
																	<select
																		value={
																			BORDER_PT_PRESETS.includes(
																				borderWidthPt.toFixed(1),
																			)
																				? borderWidthPt.toFixed(1)
																				: "manual"
																		}
																		onChange={(e) => {
																			if (e.target.value === "manual") return;
																			const pt = Number(e.target.value);
																			if (Number.isFinite(pt)) {
																				setContainerBorderWidthMm(
																					Number((pt * PT_TO_MM).toFixed(3)),
																				);
																			}
																		}}
																		className="w-full border rounded pl-9 pr-2 py-2 text-xs bg-white appearance-none"
																	>
																		{BORDER_PT_PRESETS.map((pt) => (
																			<option key={`bw-${pt}`} value={pt}>
																				{pt} pt
																			</option>
																		))}
																		<option value="manual">Manual</option>
																	</select>
																	<ChevronDown className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
																</div>
																<input
																	type="number"
																	min="0"
																	step="0.1"
																	value={
																		Number.isFinite(borderWidthPt)
																			? borderWidthPt.toFixed(1)
																			: "0.0"
																	}
																	onChange={(e) => {
																		const pt = Number(e.target.value);
																		if (Number.isFinite(pt) && pt >= 0) {
																			setContainerBorderWidthMm(
																				Number((pt * PT_TO_MM).toFixed(3)),
																			);
																		}
																	}}
																	className="w-20 border rounded px-2 py-2 text-xs"
																/>
															</div>
														</div>

														<div>
															<p className="block text-xs mb-1 text-gray-600">
																Redondeo
															</p>
															<div className="flex items-center gap-2">
																<div className="relative w-full">
																	<select
																		value={
																			RADIUS_PRESETS.some(
																				(p) => p.value === containerRadiusMm,
																			)
																				? String(containerRadiusMm)
																				: "manual"
																		}
																		onChange={(e) => {
																			if (e.target.value === "manual") return;
																			const numeric = Number(e.target.value);
																			if (Number.isFinite(numeric)) {
																				setContainerRadiusMm(numeric);
																			}
																		}}
																		className="w-full border rounded pl-9 pr-2 py-2 text-xs bg-white appearance-none"
																	>
																		{RADIUS_PRESETS.map((preset) => (
																			<option
																				key={`br-${preset.value}`}
																				value={preset.value}
																			>
																				{preset.label}
																			</option>
																		))}
																		<option value="manual">Manual</option>
																	</select>
																	<ChevronDown className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
																</div>
																<input
																	type="number"
																	min="0"
																	step="1"
																	value={
																		Number.isFinite(containerRadiusMm)
																			? containerRadiusMm
																			: 0
																	}
																	onChange={(e) => {
																		const numeric = Number(e.target.value);
																		if (
																			Number.isFinite(numeric) &&
																			numeric >= 0
																		) {
																			setContainerRadiusMm(
																				Math.min(50, Math.round(numeric)),
																			);
																		}
																	}}
																	className="w-20 border rounded px-2 py-2 text-xs"
																/>
															</div>
														</div>

														<div>
															<p className="block text-xs mb-1 text-gray-600">
																Color
															</p>
															<div className="flex items-center gap-2 rounded border bg-white px-2 py-2">
																<input
																	type="color"
																	value={containerBorderColor}
																	onChange={(e) =>
																		setContainerBorderColor(e.target.value)
																	}
																	className="h-8 w-10 cursor-pointer rounded border border-gray-300 bg-white p-0"
																	aria-label="Color del borde"
																/>
																<input
																	type="text"
																	value={containerBorderColor}
																	onChange={(e) =>
																		setContainerBorderColor(e.target.value)
																	}
																	className="w-full border rounded px-2 py-1 text-xs"
																	placeholder="#d1d5db"
																/>
															</div>
														</div>
													</div>
												</div>
											)}
										</div>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
											<button
												type="button"
												onClick={() => setManualMoveEnabled((v) => !v)}
												className={`w-full px-3 py-2 text-xs font-medium rounded ${
													manualMoveEnabled
														? "bg-emerald-600 text-white hover:bg-emerald-700"
														: "bg-gray-200 text-gray-700 hover:bg-gray-300"
												}`}
												title="Activar o desactivar movimiento manual de elementos"
											>
												{manualMoveEnabled
													? "Mover elementos: ON"
													: "Mover elementos: OFF"}
											</button>
											<button
												type="button"
												onClick={() => setCellOffsets({})}
												className="w-full px-3 py-2 text-xs font-medium rounded bg-blue3 text-white hover:bg-blue5"
												title="Restablecer posiciones manuales"
											>
												Reset posiciones
											</button>
										</div>
									</div>
								</section>
							</div>
						</div>
						<div className="mb-4 w-full">
							{/* Professional drag and drop upload area */}
							<section
								onDrop={handleDrop}
								onDragOver={handleDragOver}
								onDragLeave={handleDragLeave}
								aria-label="Zona de carga de archivos"
								className={clsx(
									"relative border-2 border-dashed rounded-lg p-6 transition-all cursor-pointer",
									isDragOver
										? "border-blue-500 bg-blue-50"
										: "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100",
								)}
							>
								<input
									type="file"
									accept="image/*,application/pdf"
									multiple
									onChange={handleFileChange}
									className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
									id="file-upload"
								/>
								<div className="text-center">
									<svg
										className="mx-auto h-12 w-12 text-gray-400"
										stroke="currentColor"
										fill="none"
										viewBox="0 0 48 48"
										aria-hidden="true"
									>
										<path
											d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
											strokeWidth="2"
											strokeLinecap="round"
											strokeLinejoin="round"
										/>
									</svg>
									<p className="mt-2 text-sm text-gray-600">
										<span className="font-semibold text-blue-600">
											Haz clic para seleccionar
										</span>{" "}
										o arrastra archivos aquí
									</p>
									<p className="text-xs text-gray-500 mt-1">
										Imágenes o PDF (múltiples archivos permitidos)
									</p>
									{images.length > 0 && (
										<p className="mt-2 text-xs font-medium text-green-600">
											{images.length} archivo{images.length !== 1 ? "s" : ""}{" "}
											seleccionado{images.length !== 1 ? "s" : ""}
										</p>
									)}
								</div>
							</section>

							<button
								type="button"
								onClick={handleUpload}
								disabled={loading || images.length === 0}
								className="w-full mt-3 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors touch-manipulation"
							>
								{loading ? "Subiendo..." : "Subir a Dropbox"}
							</button>
							<div className="flex flex-col sm:flex-row gap-2 items-stretch mt-2 w-full">
								<button
									type="button"
									onClick={handleExportPDF}
									disabled={loading || printing || uploaded.length === 0}
									className="flex-1 px-3 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-sm font-medium touch-manipulation"
								>
									Guardar PDF
								</button>
								<button
									type="button"
									onClick={handleOpenPDF}
									disabled={loading || printing || uploaded.length === 0}
									className="flex-1 px-3 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 text-sm font-medium touch-manipulation"
								>
									Abrir PDF
								</button>
								<button
									type="button"
									onClick={async () => {
										setError("");
										setPrintJobId(null);
										setPrinting(true);
										try {
											const res = await generatePdfBlob();
											if (!res) return;
											const { blob } = res;
											const filename = `${(job?.name || jobId).replace(/[^a-z0-9.\-_]/gi, "_")}.pdf`;
											const form = new FormData();
											form.append("file", blob, filename);
											form.append("printerId", "default");

											const r = await window.fetch("/api/prints", {
												method: "POST",
												body: form,
											});
											let json = null;
											try {
												json = await r.json();
											} catch (_e) {
												/* ignore JSON parse errors */
											}
											if (!r.ok) {
												const serverMsg =
													json?.error || (await r.text().catch(() => ""));
												throw new Error(
													serverMsg ||
														`Error encolando impresión (status ${r.status})`,
												);
											}
											setPrintJobId(json.id);
										} catch (err: unknown) {
											setError(
												`Error encolando para impresión: ${getErrorMessage(err)}`,
											);
										} finally {
											setPrinting(false);
										}
									}}
									disabled={loading || printing}
									className="flex-1 px-3 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-sm font-medium touch-manipulation"
								>
									{printing ? "Encolando..." : "Imprimir (Brother)"}
								</button>
							</div>
							{printJobId && (
								<div className="mt-2 text-sm text-green-700">
									Trabajo encolado: <strong>{printJobId}</strong>
								</div>
							)}
							{error && <div className="text-red-600 mb-2">{error}</div>}
						</div>
						<div className="grid grid-cols-1 gap-3 w-full">
							{uploaded.map((file, idx) => (
								<div
									key={file.id}
									className="relative group border rounded-lg bg-white shadow-sm p-3 w-full overflow-hidden"
								>
									{/* Fila 1: Nombre arriba */}
									<div className="mb-2">
										<div
											className="text-base sm:text-lg font-semibold text-gray-700 truncate text-left px-2 sm:px-0"
											title={file.file_name}
										>
											{file.file_name}
										</div>
									</div>
									{/* Fila 2: Imagen y Repetir en una sola fila */}
									<div className="flex flex-row items-center gap-4 mb-2">
										<div className="flex flex-col items-center justify-center">
											<div className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center bg-white border rounded-lg shadow overflow-hidden">
												{isImageLike(file) ? (
													file.url ? (
														<Image
															src={file.url}
															alt={file.file_name}
															unoptimized
															width={400}
															height={400}
															className="w-full h-full object-contain rounded"
															style={{ maxWidth: "100%", maxHeight: "100%" }}
														/>
													) : (
														<div className="text-gray-500 text-sm">
															No disponible
														</div>
													)
												) : isPdfLike(file) ? (
													<div className="text-gray-500 text-sm">PDF</div>
												) : (
													<div className="text-gray-500 text-sm">Archivo</div>
												)}
											</div>
											{/* Selector de modo de ajuste */}
											<div className="mt-2 w-full">
												<p className="block text-xs text-gray-500 mb-1">
													Ajuste:
												</p>
												<select
													className="w-full border rounded px-2 py-1 text-xs"
													value={imageSettings[idx]?.fitMode || "contain"}
													onChange={(e) => {
														const fitMode = e.target
															.value as ImageSetting["fitMode"];
														setImageSettings((s) => ({
															...s,
															[idx]: {
																...(s[idx] || defaultImageSetting()),
																fitMode,
															},
														}));
													}}
												>
													<option value="contain">
														Sin distorsión (ajustar)
													</option>
													<option value="cover">
														Cubrir (rellenar sin distorsión)
													</option>
													<option value="stretch">
														Distorsionar (rellenar)
													</option>
												</select>
											</div>
										</div>
										<div className="flex flex-col justify-center min-w-[120px]">
											<span className="text-gray-600 text-xs sm:text-sm whitespace-nowrap mb-1">
												Repetir:
											</span>
											<div className="flex items-center gap-2 bg-gray-50 border rounded-lg px-2 py-2 w-full justify-center">
												<button
													type="button"
													onClick={() => {
														const current =
															imageSettings[idx]?.repeatCount || 1;
														if (current > 1) {
															setImageSettings((s) => ({
																...s,
																[idx]: {
																	...(s[idx] || defaultImageSetting()),
																	repeatCount: current - 1,
																},
															}));
														}
													}}
													className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg bg-gray-200 hover:bg-gray-200 active:bg-gray-300 text-lg sm:text-xl flex items-center justify-center touch-manipulation"
												>
													−
												</button>
												<span className="text-sm sm:text-base font-normal w-6 text-center">
													{imageSettings[idx]?.repeatCount || 1}
												</span>
												<button
													type="button"
													onClick={() => {
														const current =
															imageSettings[idx]?.repeatCount || 1;
														if (current < 100) {
															setImageSettings((s) => ({
																...s,
																[idx]: {
																	...(s[idx] || defaultImageSetting()),
																	repeatCount: current + 1,
																},
															}));
														}
													}}
													className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg bg-gray-200 hover:bg-gray-200 active:bg-gray-300 text-lg sm:text-xl flex items-center justify-center touch-manipulation"
												>
													+
												</button>
											</div>
										</div>
									</div>
									{/* Fila 3: Tamaño */}
									<div className="mt-2">
										<div className="flex flex-col w-full">
											<span className="text-gray-600 text-xs sm:text-sm whitespace-nowrap mb-1">
												Tamaño:
											</span>
											<div className="flex flex-row gap-2 sm:flex-col md:flex-row items-center justify-center bg-gray-50 border rounded-lg px-2 py-2 md:gap-8">
												<div className="flex items-center min-w-0 overflow-hidden">
													<span className="text-gray-500 text-xs sm:text-sm whitespace-nowrap">
														Ancho
													</span>
													<button
														type="button"
														onClick={() => {
															const current = imageSettings[idx]?.spanCols || 1;
															if (current > 1) {
																setImageSettings((s) => ({
																	...s,
																	[idx]: {
																		...(s[idx] || defaultImageSetting()),
																		spanCols: current - 1,
																	},
																}));
															}
														}}
														className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gray-200 hover:bg-gray-200 active:bg-gray-300 text-xl sm:text-lg flex items-center justify-center touch-manipulation mx-1"
													>
														−
													</button>
													<span className="text-sm sm:text-base font-normal w-6 text-center">
														{imageSettings[idx]?.spanCols || 1}
													</span>
													<button
														type="button"
														onClick={() => {
															const current = imageSettings[idx]?.spanCols || 1;
															if (current < layoutConfig.cols) {
																setImageSettings((s) => ({
																	...s,
																	[idx]: {
																		...(s[idx] || defaultImageSetting()),
																		spanCols: current + 1,
																	},
																}));
															}
														}}
														className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gray-200 hover:bg-gray-200 active:bg-gray-300 text-xl sm:text-lg flex items-center justify-center touch-manipulation mx-1"
													>
														+
													</button>
												</div>
												<div className="flex items-center min-w-0 overflow-hidden">
													<span className="text-gray-500 text-xs sm:text-sm whitespace-nowrap">
														Alto
													</span>
													<button
														type="button"
														onClick={() => {
															const current = imageSettings[idx]?.spanRows || 1;
															if (current > 1) {
																setImageSettings((s) => ({
																	...s,
																	[idx]: {
																		...(s[idx] || defaultImageSetting()),
																		spanRows: current - 1,
																	},
																}));
															}
														}}
														className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gray-200 hover:bg-gray-200 active:bg-gray-300 text-xl sm:text-xl flex items-center justify-center touch-manipulation mx-1"
													>
														−
													</button>
													<span className="text-sm sm:text-base font-normal w-6 text-center">
														{imageSettings[idx]?.spanRows || 1}
													</span>
													<button
														type="button"
														onClick={() => {
															const current = imageSettings[idx]?.spanRows || 1;
															if (current < layoutConfig.rows) {
																setImageSettings((s) => ({
																	...s,
																	[idx]: {
																		...(s[idx] || defaultImageSetting()),
																		spanRows: current + 1,
																	},
																}));
															}
														}}
														className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gray-200 hover:bg-gray-200 active:bg-gray-300 text-xl sm:text-lg flex items-center justify-center touch-manipulation mx-1"
													>
														+
													</button>
												</div>
											</div>
										</div>
									</div>
									<div className="mt-2">
										<div className="flex flex-col w-full">
											<span className="text-gray-600 text-xs sm:text-sm whitespace-nowrap mb-1">
												Tamaño personalizado ({sizeUnit})
											</span>
											<div className="flex flex-row gap-2 items-center bg-gray-50 border rounded-lg px-2 py-2">
												<input
													type="number"
													min="0"
													step="0.1"
													value={imageSettings[idx]?.customWidth ?? ""}
													onChange={(e) => {
														const raw = e.target.value;
														const parsed = raw === "" ? null : Number(raw);
														setImageSettings((s) => ({
															...s,
															[idx]: {
																...(s[idx] || defaultImageSetting()),
																customWidth:
																	parsed !== null &&
																	Number.isFinite(parsed) &&
																	parsed > 0
																		? parsed
																		: null,
															},
														}));
													}}
													className="w-1/2 border rounded px-2 py-1 text-xs"
													placeholder={`Ancho (${sizeUnit})`}
												/>
												<input
													type="number"
													min="0"
													step="0.1"
													value={imageSettings[idx]?.customHeight ?? ""}
													onChange={(e) => {
														const raw = e.target.value;
														const parsed = raw === "" ? null : Number(raw);
														setImageSettings((s) => ({
															...s,
															[idx]: {
																...(s[idx] || defaultImageSetting()),
																customHeight:
																	parsed !== null &&
																	Number.isFinite(parsed) &&
																	parsed > 0
																		? parsed
																		: null,
															},
														}));
													}}
													className="w-1/2 border rounded px-2 py-1 text-xs"
													placeholder={`Alto (${sizeUnit})`}
												/>
											</div>
											<p className="text-[11px] text-gray-500 mt-1">
												Si dejas vacío, usa el tamaño automático de la grilla.
											</p>
										</div>
									</div>
									{/* Delete button */}
									<div className="absolute top-2 right-2 z-10">
										<button
											type="button"
											onClick={() => handleDelete(file.id, file.path)}
											className="bg-red-600 text-white rounded-full w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center opacity-90 hover:opacity-100 active:bg-red-700 text-lg sm:text-base shadow-md touch-manipulation"
											title="Eliminar"
											disabled={loading}
										>
											×
										</button>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
				{/* <div className="text-sm text-gray-500 mt-8">
          <ol className="list-decimal ml-6">
            <li>Sube imágenes o PDFs asociados a este documento.</li>
            <li>Por defecto, cada imagen aparece una sola vez.</li>
            <li>Usa los controles "Repetir" para duplicar una imagen en la página.</li>
            <li>Usa "Tamaño" para que una imagen ocupe más espacio (ejemplo: 2×1 = mitad superior).</li>
            <li>El layout se ajusta automáticamente según la cantidad total de imágenes.</li>
          </ol>
          <div className="mt-2 font-semibold">Ejemplos: 1 imagen = centrada completa | 2 imágenes = arriba/abajo | 4 = grilla 2×2</div>
        </div> */}
			</div>
		</div>
	);
}
