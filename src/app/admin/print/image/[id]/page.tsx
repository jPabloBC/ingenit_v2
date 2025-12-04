"use client";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useMemo, useRef } from "react";
import { uploadImage, deleteFile, getTemporaryLink } from "@/lib/dropboxClient";
import { saveFileRecord, listFilesByPrintJob, deleteFileRecord } from "@/lib/rtStorage";
import { getPrintJob } from "@/lib/printJobs";
import clsx from "classnames";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

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

function useContainerWidth(ref: React.RefObject<HTMLElement>) {
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

  const [job, setJob] = useState<any>(null);
  const [images, setImages] = useState<File[]>([]);
  const [uploaded, setUploaded] = useState<{ id: string; path: string; url: string; file_name: string; file_type: string }[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [printJobId, setPrintJobId] = useState<string | null>(null);

  // Editor de preview
  const [pageSize, setPageSize] = useState<keyof typeof PAGE_SIZES>("Letter");
  const [gap, setGap] = useState(2);
  const [margin, setMargin] = useState(5); // Margen del lienzo en mm

  // Manual grid size (null = auto)
  const [manualCols, setManualCols] = useState<number | null>(null);
  const [manualRows, setManualRows] = useState<number | null>(null);

  const previewRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const containerWidth = useContainerWidth(containerRef as any);

  // Per-image controls: repeatCount (veces que aparece), spanCols, spanRows (tamaño relativo)
  const [imageSettings, setImageSettings] = useState<Record<number, { repeatCount: number; spanCols: number; spanRows: number; fitMode?: string }>>({});

  // Drag and drop state
  const [isDragOver, setIsDragOver] = useState(false);

  // Track window width for responsive scaling
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1000);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calcular layout automático basado en cantidad de imágenes y sus repeticiones
  const layoutConfig = useMemo(() => {
    const cells: { imgIdx: number; spanCols: number; spanRows: number }[] = [];

    // Por cada imagen, agregar tantas celdas como su repeatCount
    uploaded.forEach((_, imgIdx) => {
      const settings = imageSettings[imgIdx] || { repeatCount: 1, spanCols: 1, spanRows: 1 };
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

      const maxSpanCols = Math.max(...cells.map(c => c.spanCols));
      const maxSpanRows = Math.max(...cells.map(c => c.spanRows));

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

  useEffect(() => {
    if (!jobId) return;
    const fetchJob = async () => {
      try {
        const data = await getPrintJob(jobId);
        setJob(data);
      } catch (err: any) {
        setError("Error cargando documento: " + (err.message || err.toString()));
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
        const res = await fetch(`/api/print-job-files?jobId=${encodeURIComponent(jobId)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Error fetching files');
        // Obtener link temporal para cada archivo
        const files = await Promise.all(
          (json.files || []).map(async (file: any) => {
            let url = null;
            if (file.file_type && file.file_type.startsWith('image/')) {
              try {
                url = await getTemporaryLink(file.path);
                console.log('Dropbox link for', file.file_name, ':', url);
              } catch (e) {
                console.error('Error obteniendo link temporal de Dropbox para', file.file_name, e);
                url = null;
              }
            }
            return { ...file, url };
          })
        );
        if (!cancelled) setUploaded(files);
      } catch (err: any) {
        if (!cancelled) setError("Error cargando archivos: " + (err.message || err.toString()));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchFiles();
    return () => { cancelled = true; };
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
      setImages(Array.from(files).filter(f => f.type.startsWith('image/') || f.type === 'application/pdf'));
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
        const record = await saveFileRecord({
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
        const res = await fetch(`/api/print-job-files?jobId=${encodeURIComponent(jobId)}`);
        const json = await res.json();
        if (res.ok) {
          setUploaded(json.files || []);
        }
      } catch (e) {
        // ignore refresh errors here; next effect or manual reload will recover
      }
    } catch (err: any) {
      setError("Error subiendo archivo: " + (err.message || err.toString()));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, path: string) => {
    setLoading(true);
    try {
      await deleteFile(path);
      await deleteFileRecord(id);
      setUploaded(uploaded.filter(img => img.id !== id));
    } catch (err: any) {
      setError("Error eliminando archivo: " + (err.message || err.toString()));
    } finally {
      setLoading(false);
    }
  };

  const waitForImages = (root: HTMLElement) => {
    const imgs = Array.from(root.querySelectorAll('img')) as HTMLImageElement[];
    return Promise.all(imgs.map(img => {
      if (img.complete && img.naturalWidth !== 0) return Promise.resolve();
      return new Promise<void>(resolve => {
        const onLoad = () => { cleanup(); resolve(); };
        const onErr = () => { cleanup(); resolve(); };
        const cleanup = () => { img.removeEventListener('load', onLoad); img.removeEventListener('error', onErr); };
        img.addEventListener('load', onLoad);
        img.addEventListener('error', onErr);
      });
    }));
  };

  const generatePdfBlob = async () => {
    setError("");
    if (!previewRef.current) {
      setError('No hay vista previa para exportar.');
      return null;
    }
    await waitForImages(previewRef.current);
    const canvas = await html2canvas(previewRef.current, { scale: 2, useCORS: true, allowTaint: false, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ unit: 'px', format: [canvas.width, canvas.height] });
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    const blob = pdf.output('blob');
    return { blob, pdf } as any;
  };

  const handleExportPDF = async () => {
    try {
      const res = await generatePdfBlob();
      if (!res) return;
      const { blob, pdf } = res;
      const filename = `${(job?.name || jobId).replace(/[^a-z0-9\.\-\_]/gi, '_')}.pdf`;
      // Trigger download
      pdf.save(filename);
      // Also return blob URL (optional, not necessary)
    } catch (err: any) {
      setError('Error exportando PDF: ' + (err.message || err.toString()));
    }
  };

  const handleOpenPDF = async () => {
    try {
      const res = await generatePdfBlob();
      if (!res) return;
      const { blob } = res;
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err: any) {
      setError('Error generando PDF: ' + (err.message || err.toString()));
    }
  };

  // Calculate scale based on container width
  const baseWidth = PAGE_SIZES[pageSize].width * PREVIEW_SCALE;
  const baseHeight = PAGE_SIZES[pageSize].height * PREVIEW_SCALE;
  const scale = containerWidth ? Math.min(1, (containerWidth - 32) / baseWidth) : 1;
  const scaledHeight = baseHeight * scale;

  return (
    <div className="w-full min-h-screen bg-white p-0 m-0 overflow-x-hidden">
      <div className="py-4 px-3 sm:py-6 sm:px-6 md:px-8 lg:px-6 xl:px-16 max-w-[100vw] mx-auto">
        <h1 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 break-words">
          Doc.: {job?.name ? (
            <>
              <span className="text-blue-700">{cleanCorrelativo(job.name)}</span>
              <span className="ml-2 text-sm sm:text-base text-gray-300 break-all">ID: {jobId?.split('-')[0]}</span>
            </>
          ) : <span className="text-gray-400">...</span>}
        </h1>
        {/* Controles de editor */}
        <div className="w-full flex justify-center px-2 md:px-0">
          <div className="flex flex-col md:flex-row flex-wrap gap-2 md:gap-3 mb-2 md:mb-4 items-stretch max-w-full w-full overflow-x-auto mx-auto justify-center">
          <div className="w-full md:w-auto min-w-0 flex-shrink-0">
            <label className="block text-xs sm:text-sm font-normal mb-1 text-center text-gray6">Tamaño de hoja</label>
            <select value={pageSize} onChange={e => setPageSize(e.target.value as any)} className="text-center border rounded px-2 py-1 w-full md:w-auto text-sm">
              {Object.entries(PAGE_SIZES).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-row gap-1 md:gap-2 w-full md:w-auto max-w-full flex-shrink-0">
            <div className="border px-1 w-1/2 md:w-auto min-w-0 flex flex-col items-center justify-center">
              <label className="block text-xs sm:text-sm font-normal mb-1 text-center text-gray6">Espaciado (mm)</label>
              <div className="flex items-center rounded overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    if (gap > 0) setGap(gap - 1);
                  }}
                  className="px-2 py-1.5 sm:px-3 sm:py-2 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 border-r text-xl sm:text-sm touch-manipulation"
                >
                  −
                </button>
                <span className="px-3 py-1.5 sm:px-4 sm:py-2 text-base font-medium min-w-[2.5rem] text-center bg-white">
                  {gap}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (gap < 20) setGap(gap + 1);
                  }}
                  className="px-2 py-1.5 sm:px-3 sm:py-2 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 border-l text-xl sm:text-sm touch-manipulation"
                >
                  +
                </button>
              </div>
            </div>
            <div className="border px-1 w-1/2 md:w-auto min-w-0 flex flex-col items-center justify-center">
              <label className="block text-xs sm:text-sm font-normal mb-1 text-center text-gray6">Márgenes (mm)</label>
              <div className="flex items-center rounded overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    if (margin > 0) setMargin(margin - 1);
                  }}
                  className="px-2 py-1.5 sm:px-3 sm:py-2 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 border-r text-xl sm:text-sm touch-manipulation"
                >
                  −
                </button>
                <span className="px-3 py-1.5 sm:px-4 sm:py-2 text-base font-medium min-w-[2.5rem] text-center bg-white">
                  {margin}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (margin < 50) setMargin(margin + 1);
                  }}
                  className="px-2 py-1.5 sm:px-3 sm:py-2 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 border-l text-xl sm:text-sm touch-manipulation"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Grid size controls */}
          <div className="w-full md:w-auto border px-1 min-w-0 flex-shrink-0">
            <label className="block text-xs sm:text-sm font-normal mb-1 text-center text-gray6">Grilla</label>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {/* Columnas */}
              <div className="flex items-center gap-2">
                <span className="text-gray-600 text-xs whitespace-nowrap">Col:</span>
                <div className="flex items-center rounded overflow-hidden border">
                <button
                  type="button"
                  onClick={() => {
                    let current = manualCols;
                    if (current === null) current = layoutConfig.cols;
                    if (current > 1) {
                      setManualCols(current - 1);
                    } else if (manualCols === null && layoutConfig.cols > 1) {
                      setManualCols(layoutConfig.cols - 1);
                    }
                  }}
                  className="px-2 py-1.5 sm:px-3 sm:py-2 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 border-r text-xl sm:text-sm touch-manipulation"
                >
                  −
                </button>
                <span className="px-3 py-1.5 sm:px-4 sm:py-2 text-base font-medium min-w-[2.5rem] text-center bg-white">
                  {manualCols || layoutConfig.cols}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    let current = manualCols;
                    if (current === null) current = layoutConfig.cols;
                    if (current < 20) {
                      setManualCols(current + 1);
                    } else if (manualCols === null && layoutConfig.cols < 20) {
                      setManualCols(layoutConfig.cols + 1);
                    }
                  }}
                  className="px-2 py-1.5 sm:px-3 sm:py-2 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 border-l text-xl sm:text-sm touch-manipulation"
                >
                  +
                </button>
              </div>
            </div>

              {/* Filas */}
              <div className="flex items-center gap-2">
                <span className="text-gray-600 text-xs whitespace-nowrap">Row:</span>
                <div className="flex items-center rounded overflow-hidden border">
                <button
                  type="button"
                  onClick={() => {
                    let current = manualRows;
                    if (current === null) current = layoutConfig.rows;
                    if (current > 1) {
                      setManualRows(current - 1);
                    } else if (manualRows === null && layoutConfig.rows > 1) {
                      setManualRows(layoutConfig.rows - 1);
                    }
                  }}
                  className="px-2 py-1.5 sm:px-3 sm:py-2 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 border-r text-xl sm:text-sm touch-manipulation"
                >
                  −
                </button>
                <span className="px-3 py-1.5 sm:px-4 sm:py-2 text-base font-medium min-w-[2.5rem] text-center bg-white">
                  {manualRows || layoutConfig.rows}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    let current = manualRows;
                    if (current === null) current = layoutConfig.rows;
                    if (current < 20) {
                      setManualRows(current + 1);
                    } else if (manualRows === null && layoutConfig.rows < 20) {
                      setManualRows(layoutConfig.rows + 1);
                    }
                  }}
                  className="px-2 py-1.5 sm:px-3 sm:py-2 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 border-l text-xl sm:text-sm touch-manipulation"
                >
                  +
                </button>
              </div>
            </div>

              <button
                onClick={() => {
                  setManualCols(null);
                  setManualRows(null);
                }}
                className="w-full md:w-auto flex justify-center md:justify-start px-3 py-1.5 mb-2 text-xs bg-blue3 hover:bg-blue5 active:bg-blue7 text-white rounded font-medium touch-manipulation"
                title="Volver a modo automático"
              >
                Auto
              </button>
            </div>
          </div>

          {/* <div className="text-xs sm:text-sm text-gray-600 w-full sm:w-auto flex items-end pb-1">
            {layoutConfig.cells.length} imágenes
          </div> */}
          </div>
        </div>
        {/* ...eliminado debug de archivos subidos... */}
        {/* Preview de hoja editable */}
        <div className="flex flex-col lg:flex-row gap-2 w-full">
          {/* Preview canvas a la izquierda */}
          <div className="flex-1 w-full flex items-start justify-center" ref={containerRef}>
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
                    const usableWidth = PAGE_SIZES[pageSize].width * PREVIEW_SCALE - (marginPx * 2);
                    const usableHeight = PAGE_SIZES[pageSize].height * PREVIEW_SCALE - (marginPx * 2);
                    const gapPx = gap * PREVIEW_SCALE;
                    const totalGapX = gapPx * (cols - 1);
                    const totalGapY = gapPx * (rows - 1);
                    const cellW = (usableWidth - totalGapX) / cols;
                    const cellH = (usableHeight - totalGapY) / rows;

                    // Construir grid de posiciones ocupadas
                    const grid: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
                    const renderedCells: React.ReactElement[] = [];

                    let cellIndex = 0;
                    for (let row = 0; row < rows && cellIndex < cells.length; row++) {
                      for (let col = 0; col < cols && cellIndex < cells.length; col++) {
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
                            if (row + dr >= rows || col + dc >= cols || grid[row + dr][col + dc]) {
                              fits = false;
                            }
                          }
                        }

                        if (!fits) {
                          // No cabe con span, usar 1x1
                          grid[row][col] = true;
                          const left = marginPx + col * (cellW + gapPx);
                          const top = marginPx + row * (cellH + gapPx);

                          renderedCells.push(
                            <div
                              key={`${file.id}-${row}-${col}`}
                              className="absolute border border-gray-300 bg-white flex items-center justify-center overflow-hidden shadow-sm"
                              style={{ left, top, width: cellW, height: cellH }}
                            >
                              {file.file_type.startsWith("image/") ? (
                                file.url ? (
                                  <img
                                    src={file.url}
                                    alt={file.file_name}
                                    style={
                                      imageSettings[cell.imgIdx]?.fitMode === 'cover'
                                        ? { width: '100%', height: '100%', objectFit: 'cover' }
                                        : imageSettings[cell.imgIdx]?.fitMode === 'stretch'
                                        ? { width: '100%', height: '100%', objectFit: 'fill' }
                                        : { width: '100%', height: '100%', objectFit: 'contain' }
                                    }
                                  />
                                ) : (
                                  <div className="text-xs text-gray-500">Imagen no disponible</div>
                                )
                              ) : file.file_type === "application/pdf" ? (
                                <span className="text-xs text-gray-500">PDF</span>
                              ) : (
                                <span className="text-xs text-gray-500">Archivo</span>
                              )}
                            </div>
                          );
                        } else {
                          // Marcar celdas ocupadas
                          for (let dr = 0; dr < cell.spanRows; dr++) {
                            for (let dc = 0; dc < cell.spanCols; dc++) {
                              grid[row + dr][col + dc] = true;
                            }
                          }

                          const left = marginPx + col * (cellW + gapPx);
                          const top = marginPx + row * (cellH + gapPx);
                          const width = cellW * cell.spanCols + gapPx * (cell.spanCols - 1);
                          const height = cellH * cell.spanRows + gapPx * (cell.spanRows - 1);

                          renderedCells.push(
                            <div
                              key={`${file.id}-${row}-${col}`}
                              className="absolute border border-gray-300 bg-white flex items-center justify-center overflow-hidden shadow-sm"
                              style={{ left, top, width, height }}
                            >
                              {file.file_type.startsWith("image/") ? (
                                file.url ? (
                                  <img
                                    src={file.url}
                                    alt={file.file_name}
                                    style={
                                      imageSettings[cell.imgIdx]?.fitMode === 'cover'
                                        ? { width: '100%', height: '100%', objectFit: 'cover' }
                                        : imageSettings[cell.imgIdx]?.fitMode === 'stretch'
                                        ? { width: '100%', height: '100%', objectFit: 'fill' }
                                        : { width: '100%', height: '100%', objectFit: 'contain' }
                                    }
                                  />
                                ) : (
                                  <div className="text-xs text-gray-500">Imagen no disponible</div>
                                )
                              ) : file.file_type === "application/pdf" ? (
                                <span className="text-xs text-gray-500">PDF</span>
                              ) : (
                                <span className="text-xs text-gray-500">Archivo</span>
                              )}
                            </div>
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
          <div className="w-full lg:w-80 xl:w-96 flex-shrink-0">
            <div className="mb-4 w-full">
              {/* Professional drag and drop upload area */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={clsx(
                  "relative border-2 border-dashed rounded-lg p-6 transition-all cursor-pointer",
                  isDragOver
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100"
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
                    <span className="font-semibold text-blue-600">Haz clic para seleccionar</span> o arrastra archivos aquí
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Imágenes o PDF (múltiples archivos permitidos)
                  </p>
                  {images.length > 0 && (
                    <p className="mt-2 text-xs font-medium text-green-600">
                      {images.length} archivo{images.length !== 1 ? 's' : ''} seleccionado{images.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={handleUpload}
                disabled={loading || images.length === 0}
                className="w-full mt-3 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors touch-manipulation"
              >
                {loading ? "Subiendo..." : "Subir a Dropbox"}
              </button>
              <div className="flex flex-col sm:flex-row gap-2 items-stretch mt-2 w-full">
                <button
                  onClick={async () => {
                    setError("");
                    setPrintJobId(null);
                    setPrinting(true);
                    try {
                      const res = await generatePdfBlob();
                      if (!res) return;
                      const { blob } = res;
                      const filename = `${(job?.name || jobId).replace(/[^a-z0-9\.\-\_]/gi, '_')}.pdf`;
                      const form = new FormData();
                      form.append('file', blob, filename);
                      form.append('printerId', 'default');

                      const r = await window.fetch('/api/prints', {
                        method: 'POST',
                        body: form,
                      });
                      let json = null;
                      try { json = await r.json(); } catch (e) { /* ignore JSON parse errors */ }
                      if (!r.ok) {
                        const serverMsg = json?.error || (await r.text().catch(() => '')); 
                        throw new Error(serverMsg || `Error encolando impresión (status ${r.status})`);
                      }
                      setPrintJobId(json.id);
                    } catch (err: any) {
                      setError('Error encolando para impresión: ' + (err?.message || err));
                    } finally {
                      setPrinting(false);
                    }
                  }}
                  disabled={loading || printing}
                  className="flex-1 px-3 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-sm font-medium touch-manipulation"
                >
                  {printing ? 'Encolando...' : 'Imprimir (Brother)'}
                </button>
              </div>
              {printJobId && (
                <div className="mt-2 text-sm text-green-700">Trabajo encolado: <strong>{printJobId}</strong></div>
              )}
              {error && <div className="text-red-600 mb-2">{error}</div>}
            </div>
            <div className="grid grid-cols-1 gap-3 w-full">
              {uploaded.map((file, idx) => (
                <div key={file.id} className="relative group border rounded-lg bg-white shadow-sm p-3 w-full overflow-hidden">
                  {/* Fila 1: Nombre arriba */}
                  <div className="mb-2">
                    <div className="text-base sm:text-lg font-semibold text-gray-700 truncate text-left px-2 sm:px-0" title={file.file_name}>{file.file_name}</div>
                  </div>
                  {/* Fila 2: Imagen y Repetir en una sola fila */}
                  <div className="flex flex-row items-center gap-4 mb-2">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center bg-white border rounded-lg shadow overflow-hidden">
                        {file.file_type.startsWith("image/") ? (
                          file.url ? (
                            <img
                              src={file.url}
                              alt={file.file_name}
                              className="w-full h-full object-contain rounded"
                              style={{ maxWidth: '100%', maxHeight: '100%' }}
                            />
                          ) : (
                            <div className="text-gray-500 text-sm">No disponible</div>
                          )
                        ) : file.file_type === "application/pdf" ? (
                          <div className="text-gray-500 text-sm">PDF</div>
                        ) : (
                          <div className="text-gray-500 text-sm">Archivo</div>
                        )}
                      </div>
                      {/* Selector de modo de ajuste */}
                      <div className="mt-2 w-full">
                        <label className="block text-xs text-gray-500 mb-1">Ajuste:</label>
                        <select
                          className="w-full border rounded px-2 py-1 text-xs"
                          value={imageSettings[idx]?.fitMode || 'contain'}
                          onChange={e => {
                            const fitMode = e.target.value;
                            setImageSettings(s => ({
                              ...s,
                              [idx]: { ...(s[idx] || { repeatCount: 1, spanCols: 1, spanRows: 1 }), fitMode }
                            }));
                          }}
                        >
                          <option value="contain">Sin distorsión (ajustar)</option>
                          <option value="cover">Cubrir (rellenar sin distorsión)</option>
                          <option value="stretch">Distorsionar (rellenar)</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex flex-col justify-center min-w-[120px]">
                      <span className="text-gray-600 text-xs sm:text-sm whitespace-nowrap mb-1">Repetir:</span>
                      <div className="flex items-center gap-2 bg-gray-50 border rounded-lg px-2 py-2 w-full justify-center">
                        <button
                          type="button"
                          onClick={() => {
                            const current = imageSettings[idx]?.repeatCount || 1;
                            if (current > 1) {
                              setImageSettings(s => ({
                                ...s,
                                [idx]: { ...(s[idx] || { repeatCount: 1, spanCols: 1, spanRows: 1 }), repeatCount: current - 1 }
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
                            const current = imageSettings[idx]?.repeatCount || 1;
                            if (current < 100) {
                              setImageSettings(s => ({
                                ...s,
                                [idx]: { ...(s[idx] || { repeatCount: 1, spanCols: 1, spanRows: 1 }), repeatCount: current + 1 }
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
                      <span className="text-gray-600 text-xs sm:text-sm whitespace-nowrap mb-1">Tamaño:</span>
                      <div className="flex flex-row gap-2 sm:flex-col md:flex-row items-center justify-center bg-gray-50 border rounded-lg px-2 py-2 md:gap-8">
                        <div className="flex items-center min-w-0 overflow-hidden">
                          <span className="text-gray-500 text-xs sm:text-sm whitespace-nowrap">Ancho</span>
                          <button
                            type="button"
                            onClick={() => {
                              const current = imageSettings[idx]?.spanCols || 1;
                              if (current > 1) {
                                setImageSettings(s => ({
                                  ...s,
                                  [idx]: { ...(s[idx] || { repeatCount: 1, spanCols: 1, spanRows: 1 }), spanCols: current - 1 }
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
                                setImageSettings(s => ({
                                  ...s,
                                  [idx]: { ...(s[idx] || { repeatCount: 1, spanCols: 1, spanRows: 1 }), spanCols: current + 1 }
                                }));
                              }
                            }}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gray-200 hover:bg-gray-200 active:bg-gray-300 text-xl sm:text-lg flex items-center justify-center touch-manipulation mx-1"
                          >
                            +
                          </button>
                        </div>
                        <div className="flex items-center min-w-0 overflow-hidden">
                          <span className="text-gray-500 text-xs sm:text-sm whitespace-nowrap">Alto</span>
                          <button
                            type="button"
                            onClick={() => {
                              const current = imageSettings[idx]?.spanRows || 1;
                              if (current > 1) {
                                setImageSettings(s => ({
                                  ...s,
                                  [idx]: { ...(s[idx] || { repeatCount: 1, spanCols: 1, spanRows: 1 }), spanRows: current - 1 }
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
                                setImageSettings(s => ({
                                  ...s,
                                  [idx]: { ...(s[idx] || { repeatCount: 1, spanCols: 1, spanRows: 1 }), spanRows: current + 1 }
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
                  {/* Delete button */}
                  <div className="absolute top-2 right-2 z-10">
                    <button
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
      </div >
    </div >
  );
}
