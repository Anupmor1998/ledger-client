import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import Modal from "./Modal";
import SearchableSelect from "./SearchableSelect";
import { createReportShareLink, getMyWhatsAppGroups } from "../lib/api";

// Configure PDF.js worker
if (typeof window !== "undefined" && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
}

function cleanPhoneForWhatsApp(phone) {
  if (!phone) return "";
  let digits = String(phone).replace(/\D/g, "");
  if (digits.length === 10) {
    digits = `91${digits}`;
  } else if (digits.length === 11 && digits.startsWith("0")) {
    digits = `91${digits.slice(1)}`;
  }
  return digits;
}

function WhatsAppIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} fill-current`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.59 20.15 12.04 20.15C10.56 20.15 9.12 19.76 7.85 19.01L7.55 18.83L4.44 19.65L5.27 16.61L5.07 16.3C4.24 14.98 3.81 13.47 3.81 11.91C3.81 7.37 7.5 3.67 12.05 3.67ZM8.79 7.38C8.61 7.38 8.32 7.45 8.08 7.71C7.84 7.97 7.17 8.6 7.17 9.87C7.17 11.14 8.09 12.37 8.22 12.55C8.35 12.73 10.04 15.34 12.63 16.45C13.25 16.71 13.73 16.87 14.11 16.99C14.73 17.19 15.29 17.16 15.74 17.09C16.24 17.02 17.27 16.47 17.49 15.86C17.7 15.24 17.7 14.71 17.64 14.6C17.58 14.5 17.43 14.44 17.2 14.33C16.96 14.21 15.8 13.64 15.58 13.56C15.37 13.48 15.22 13.44 15.07 13.67C14.92 13.91 14.5 14.44 14.38 14.57C14.26 14.71 14.13 14.73 13.9 14.61C13.66 14.5 12.91 14.25 12.01 13.45C11.31 12.83 10.84 12.06 10.71 11.83C10.59 11.6 10.7 11.47 10.82 11.36C10.93 11.25 11.07 11.07 11.19 10.93C11.31 10.79 11.35 10.69 11.43 10.53C11.51 10.37 11.47 10.23 11.41 10.11C11.35 9.99 10.88 8.83 10.68 8.36C10.49 7.9 10.3 7.96 10.15 7.96C10.02 7.95 9.87 7.95 9.72 7.95C9.57 7.95 9.33 8.01 9.13 8.23L8.79 7.38Z" />
    </svg>
  );
}

function DownloadIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} fill-none stroke-current stroke-2`}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function PrinterIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} fill-none stroke-current stroke-2`}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  );
}

function ExternalLinkIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} fill-none stroke-current stroke-2`}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function CopyIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} fill-none stroke-current stroke-2`}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function ZoomInIcon({ className = "h-3.5 w-3.5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} fill-none stroke-current stroke-2`}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="11" y1="8" x2="11" y2="14" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}

function ZoomOutIcon({ className = "h-3.5 w-3.5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} fill-none stroke-current stroke-2`}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}

function PdfCanvasPage({ pageNumber, pdfDoc, containerWidth, zoom }) {
  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);

  useEffect(() => {
    let active = true;
    if (!pdfDoc || !canvasRef.current || !containerWidth) return;

    async function renderPage() {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (!active) return;

        const unscaledViewport = page.getViewport({ scale: 1 });
        // Target base width fits container exactly (subtracting a little padding)
        const availableWidth = Math.max(containerWidth - 16, 260);
        const baseScale = availableWidth / unscaledViewport.width;
        const currentScale = baseScale * zoom;
        const viewport = page.getViewport({ scale: currentScale });

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");

        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        const renderContext = {
          canvasContext: ctx,
          viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (err) {
        if (err?.name !== "RenderingCancelledException") {
          console.error("PDF render error", err);
        }
      }
    }

    renderPage();
    return () => {
      active = false;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [pageNumber, pdfDoc, containerWidth, zoom]);

  return (
    <div className="relative mb-3 flex flex-col items-center">
      <div className="overflow-hidden rounded-lg bg-white shadow-md ring-1 ring-black/10">
        <canvas ref={canvasRef} className="block" />
      </div>
      <span className="mt-1 text-[11px] font-medium text-muted-text">
        Page {pageNumber}
      </span>
    </div>
  );
}

export default function ReportPdfPreviewModal({
  isOpen,
  onClose,
  pdfUrl,
  pdfBlob,
  fileName = "statement.pdf",
  reportParams = {},
  selectedParty = null,
}) {
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoadingPdf, setIsLoadingPdf] = useState(true);
  const [pdfError, setPdfError] = useState(null);
  const [zoom, setZoom] = useState(1.0);
  const [viewerMode, setViewerMode] = useState("canvas"); // "canvas" | "iframe"

  const [shareData, setShareData] = useState(null);
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  const [whatsappGroups, setWhatsappGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [showGroupShare, setShowGroupShare] = useState(false);
  const [customPhone, setCustomPhone] = useState("");
  const [showPhoneEditor, setShowPhoneEditor] = useState(false);

  // Measure container width for responsive canvas rendering
  const updateContainerWidth = useCallback(() => {
    if (containerRef.current) {
      const width = containerRef.current.clientWidth;
      if (width > 0) {
        setContainerWidth(width);
      }
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(updateContainerWidth, 50);
    window.addEventListener("resize", updateContainerWidth);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateContainerWidth);
    };
  }, [isOpen, updateContainerWidth]);

  // Load PDF with PDF.js
  useEffect(() => {
    if (!isOpen || (!pdfBlob && !pdfUrl)) return;

    let active = true;
    let docInstance = null;

    async function loadDocument() {
      setIsLoadingPdf(true);
      setPdfError(null);
      try {
        let data;
        if (pdfBlob) {
          data = await pdfBlob.arrayBuffer();
        } else {
          const res = await fetch(pdfUrl);
          data = await res.arrayBuffer();
        }
        if (!active) return;

        const loadingTask = pdfjsLib.getDocument({
          data,
          cMapUrl: "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.4.299/cmaps/",
          cMapPacked: true,
        });

        docInstance = await loadingTask.promise;
        if (!active) return;

        setPdfDoc(docInstance);
        setTotalPages(docInstance.numPages);
      } catch (err) {
        console.error("Failed to load PDF in canvas", err);
        if (active) {
          setPdfError("Unable to render mobile preview. You can view in native browser mode.");
          setViewerMode("iframe");
        }
      } finally {
        if (active) setIsLoadingPdf(false);
      }
    }

    loadDocument();
    return () => {
      active = false;
      if (docInstance) {
        docInstance.destroy?.();
      }
    };
  }, [isOpen, pdfBlob, pdfUrl]);

  // Load WhatsApp groups if available
  useEffect(() => {
    let active = true;
    async function loadGroups() {
      try {
        const groups = await getMyWhatsAppGroups();
        if (active) {
          setWhatsappGroups(Array.isArray(groups) ? groups : []);
        }
      } catch (_e) {
        if (active) setWhatsappGroups([]);
      }
    }
    if (isOpen) {
      loadGroups();
    }
    return () => {
      active = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      resolveShareData();
    }
  }, [isOpen]);

  if (!isOpen || !pdfUrl) return null;

  async function resolveShareData() {
    if (shareData) return shareData;
    setIsGeneratingShare(true);
    try {
      const data = await createReportShareLink(reportParams);
      setShareData(data);
      if (data?.party?.phone && !customPhone) {
        setCustomPhone(data.party.phone);
      }
      return data;
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to generate WhatsApp share link.";
      toast.error(msg);
      return null;
    } finally {
      setIsGeneratingShare(false);
    }
  }

  async function handleSendWhatsApp() {
    const data = await resolveShareData();
    if (!data) return;

    const partyPhone =
      customPhone ||
      data.party?.phone ||
      selectedParty?.phone ||
      selectedParty?.contactPhone ||
      "";
    const cleanPhone = cleanPhoneForWhatsApp(partyPhone);

    if (!cleanPhone) {
      setShowPhoneEditor(true);
      toast.info("Please enter the 10-digit WhatsApp number below to send directly.");
      return;
    }

    const messageEncoded = encodeURIComponent(data.whatsappText);
    const waUrl = `https://wa.me/${cleanPhone}?text=${messageEncoded}`;

    const isMobile =
      typeof navigator !== "undefined" &&
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isMobile) {
      window.location.href = waUrl;
    } else {
      window.open(waUrl, "_blank", "noopener,noreferrer");
    }
    toast.success(`Opening WhatsApp directly for +${cleanPhone}...`);
  }

  async function handleCopyShareLink() {
    const data = await resolveShareData();
    if (!data) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(data.whatsappText);
        toast.success("Statement link and message copied to clipboard!");
      } else {
        toast.info(data.shareUrl);
      }
    } catch (_e) {
      toast.error("Failed to copy link to clipboard.");
    }
  }

  async function handleSendToGroup() {
    if (!selectedGroupId) {
      toast.warn("Please select a WhatsApp group first");
      return;
    }
    const group = whatsappGroups.find((g) => g.id === selectedGroupId);
    if (!group) return;

    const data = await resolveShareData();
    if (!data) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(data.whatsappText);
      }
    } catch (_e) {
      // ignore
    }

    if (group.link) {
      window.open(group.link, "_blank", "noopener,noreferrer");
      toast.success(
        `Opening ${group.name}. Statement message copied to clipboard!`
      );
    } else {
      const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
        data.whatsappText
      )}`;
      window.open(waUrl, "_blank", "noopener,noreferrer");
      toast.success(`Opening WhatsApp for ${group.name}`);
    }
  }

  async function handleSharePdfFile() {
    if (!pdfBlob) {
      toast.error("PDF is still preparing. Please wait a moment.");
      return;
    }

    try {
      const file = new File([pdfBlob], fileName, { type: "application/pdf" });
      if (
        typeof navigator !== "undefined" &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          files: [file],
          title: fileName,
          text: `📄 Statement for ${partyDisplayName}`,
        });
        toast.success("PDF document shared successfully!");
        return;
      }
    } catch (err) {
      if (err.name === "AbortError") {
        return;
      }
    }

    handleDownload();
    toast.info("Downloaded PDF file. You can attach it directly into your WhatsApp chat.");
  }

  function handleDownload() {
    try {
      const link = document.createElement("a");
      link.href = pdfUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Report downloaded to your device.");
    } catch (_e) {
      toast.error("Download failed. Try opening in a new tab.");
    }
  }

  function handlePrint() {
    window.open(pdfUrl, "_blank")?.print();
  }

  function handleOpenNewTab() {
    window.open(pdfUrl, "_blank", "noopener,noreferrer");
  }

  const partyDisplayName =
    selectedParty?.firmName ||
    selectedParty?.name ||
    shareData?.party?.firmName ||
    shareData?.party?.name ||
    (reportParams?.userType === "MANUFACTURER"
      ? "Manufacturer Report"
      : "Customer Report");

  const targetPhone =
    customPhone ||
    shareData?.party?.phone ||
    selectedParty?.phone ||
    selectedParty?.contactPhone ||
    "";
  const cleanTargetPhone = cleanPhoneForWhatsApp(targetPhone);

  const modalFooter = (
    <div className="flex flex-col gap-2.5">
      {/* Primary Action Buttons (Always visible and thumb-friendly on mobile) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:items-center sm:justify-end">
        <button
          type="button"
          onClick={handleDownload}
          className="ghost-btn flex items-center justify-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold border border-border"
          title="Save PDF file to your phone/PC"
        >
          <DownloadIcon className="h-4 w-4 shrink-0" />
          <span>Download PDF</span>
        </button>

        {/* Share Actual PDF File Document */}
        <button
          type="button"
          onClick={handleSharePdfFile}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-primary/90 active:scale-[0.98] transition"
          title="Attach and share the real PDF file into WhatsApp"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 shrink-0 fill-none stroke-current stroke-2"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <span>Share PDF File</span>
        </button>

        {/* Direct WhatsApp Chat Link */}
        <button
          type="button"
          onClick={handleSendWhatsApp}
          disabled={isGeneratingShare}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#25D366] px-3 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-[#20ba5a] active:scale-[0.98] transition disabled:opacity-50"
          title="Open WhatsApp chat directly for this party"
        >
          <WhatsAppIcon className="h-4 w-4 shrink-0" />
          <span className="truncate">
            {isGeneratingShare
              ? "Preparing..."
              : cleanTargetPhone
              ? `Chat (+91 ${cleanTargetPhone.slice(-10)})`
              : "WhatsApp Chat"}
          </span>
        </button>
      </div>
    </div>
  );

  return (
    <Modal
      title={`PDF Preview: ${partyDisplayName}`}
      maxWidthClassName="max-w-4xl w-full"
      onClose={onClose}
      footer={modalFooter}
    >
      <div className="flex flex-col gap-2 py-0.5">
        {/* Compact Utility Toolbar (Zoom, Fullscreen, Print, Copy, Group) */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 rounded-lg border border-border bg-surface-muted/50 px-2.5 py-1.5 text-xs">
          {/* Zoom Controls */}
          {viewerMode === "canvas" ? (
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-medium text-muted-text mr-0.5 hidden xs:inline">
                Zoom:
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.75, +(z - 0.25).toFixed(2)))}
                disabled={zoom <= 0.75}
                className="rounded p-1 text-muted-text hover:bg-surface hover:text-text disabled:opacity-30"
                title="Zoom out"
              >
                <ZoomOutIcon />
              </button>
              <button
                type="button"
                onClick={() => setZoom(1.0)}
                className="rounded px-1.5 py-0.5 text-[11px] font-semibold text-text hover:bg-surface"
                title="Reset zoom to fit width"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.25).toFixed(2)))}
                disabled={zoom >= 2.5}
                className="rounded p-1 text-muted-text hover:bg-surface hover:text-text disabled:opacity-30"
                title="Zoom in"
              >
                <ZoomInIcon />
              </button>
              {totalPages > 0 && (
                <span className="ml-1 text-[11px] text-muted-text">
                  ({totalPages} {totalPages === 1 ? "page" : "pages"})
                </span>
              )}
            </div>
          ) : (
            <span className="text-[11px] text-muted-text">Browser Viewer</span>
          )}

          {/* Action icons */}
          <div className="flex items-center gap-1 ml-auto">
            <button
              type="button"
              onClick={handleOpenNewTab}
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] text-muted-text hover:bg-surface hover:text-text"
              title="Open PDF in a new tab"
            >
              <ExternalLinkIcon className="h-3 w-3" />
              <span className="hidden sm:inline">Fullscreen</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] text-muted-text hover:bg-surface hover:text-text"
              title="Print document"
            >
              <PrinterIcon className="h-3 w-3" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              type="button"
              onClick={handleCopyShareLink}
              disabled={isGeneratingShare}
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] text-muted-text hover:bg-surface hover:text-text"
              title="Copy statement link"
            >
              <CopyIcon className="h-3 w-3" />
              <span className="hidden sm:inline">Copy Link</span>
            </button>
            {whatsappGroups.length > 0 && (
              <button
                type="button"
                onClick={() => setShowGroupShare((prev) => !prev)}
                className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] transition ${
                  showGroupShare
                    ? "bg-primary/20 text-primary font-semibold"
                    : "text-muted-text hover:bg-surface hover:text-text"
                }`}
                title="Send to WhatsApp Group"
              >
                <WhatsAppIcon className="h-3 w-3" />
                <span>Group</span>
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                setViewerMode((m) => (m === "canvas" ? "iframe" : "canvas"))
              }
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] text-muted-text hover:bg-surface hover:text-text"
              title="Switch between responsive mobile view and raw browser iframe"
            >
              <span>{viewerMode === "canvas" ? "Native View" : "Mobile Fit"}</span>
            </button>
          </div>
        </div>

        {/* Direct Party WhatsApp Indicator & Phone Editor */}
        <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1 rounded-lg border border-[#25D366]/40 bg-[#25D366]/10 px-2.5 py-1.5 text-xs text-text">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white">
              <WhatsAppIcon className="h-3 w-3" />
            </span>
            <span className="truncate text-[11px] sm:text-xs">
              Direct Party: <strong>{partyDisplayName}</strong>
              {cleanTargetPhone ? (
                <span className="ml-1 text-[#25D366] font-bold">
                  (+91 {cleanTargetPhone.slice(-10)})
                </span>
              ) : (
                <span className="ml-1 text-amber-500 font-medium">
                  (No phone saved)
                </span>
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowPhoneEditor((prev) => !prev)}
            className="text-[11px] font-semibold text-primary underline hover:text-primary/80 shrink-0 self-end xs:self-auto"
          >
            {showPhoneEditor
              ? "Hide"
              : cleanTargetPhone
              ? "Change Number"
              : "Enter Number"}
          </button>
        </div>

        {/* Custom Phone Number Input Bar */}
        {showPhoneEditor && (
          <div className="rounded-lg border border-border bg-bg/80 p-2 text-xs">
            <label className="block text-[11px] font-semibold text-text mb-1">
              Enter Party WhatsApp Number to Send Directly:
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-text font-medium">
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={13}
                  value={customPhone}
                  onChange={(e) => setCustomPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="form-input !pl-10 !py-1 text-xs"
                />
              </div>
              <button
                type="button"
                onClick={handleSendWhatsApp}
                disabled={isGeneratingShare}
                className="inline-flex items-center gap-1 rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#20ba5a] transition shrink-0"
              >
                <WhatsAppIcon className="h-3 w-3" />
                <span>Send Direct</span>
              </button>
            </div>
          </div>
        )}

        {/* Collapsible WhatsApp Group Share Bar */}
        {showGroupShare && whatsappGroups.length > 0 && (
          <div className="rounded-lg border border-[#25D366]/40 bg-[#25D366]/10 p-2 text-xs">
            <span className="block font-semibold text-text mb-1.5 text-[11px]">
              Share Statement with WhatsApp Group:
            </span>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex-1">
                <SearchableSelect
                  label=""
                  value={selectedGroupId}
                  onChange={setSelectedGroupId}
                  options={whatsappGroups.map((g) => ({
                    value: g.id,
                    label: g.name,
                  }))}
                  placeholder="Select a WhatsApp group"
                  autocompleteThreshold={0}
                />
              </div>
              <button
                type="button"
                onClick={handleSendToGroup}
                disabled={!selectedGroupId || isGeneratingShare}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-1.5 font-semibold text-white hover:bg-[#20ba5a] transition text-xs shrink-0"
              >
                <WhatsAppIcon className="h-3.5 w-3.5" />
                <span>Send to Group</span>
              </button>
            </div>
          </div>
        )}

        {/* PDF Viewer Body */}
        <div
          ref={containerRef}
          className="relative w-full h-[52vh] sm:h-[62vh] rounded-xl border border-border bg-neutral-900/60 overflow-y-auto overflow-x-auto p-2"
        >
          {viewerMode === "canvas" ? (
            isLoadingPdf ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-text text-xs">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span>Rendering mobile-optimized preview...</span>
              </div>
            ) : pdfError ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
                <p className="text-xs text-amber-400">{pdfError}</p>
                <button
                  type="button"
                  onClick={() => setViewerMode("iframe")}
                  className="primary-btn !w-auto text-xs px-3 py-1.5"
                >
                  Switch to Standard Iframe
                </button>
              </div>
            ) : pdfDoc && containerWidth > 0 ? (
              <div className="flex flex-col items-center min-w-full">
                {Array.from({ length: totalPages }, (_, i) => (
                  <PdfCanvasPage
                    key={i + 1}
                    pageNumber={i + 1}
                    pdfDoc={pdfDoc}
                    containerWidth={containerWidth}
                    zoom={zoom}
                  />
                ))}
              </div>
            ) : null
          ) : (
            <iframe
              src={`${pdfUrl}#toolbar=0&view=FitH`}
              title={fileName}
              className="w-full h-full border-none rounded-lg bg-white"
            />
          )}
        </div>
      </div>
    </Modal>
  );
}
