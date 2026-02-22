import { useState, useRef, useCallback, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Document, Page, pdfjs } from "react-pdf";

import Draggable from "react-draggable";
import SignatureCanvas from "react-signature-canvas";
import toast from "react-hot-toast";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import "pdfjs-dist/build/pdf.worker.min.mjs";

// ========================================
// PDF.js Worker Configuration
// ========================================
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
const VIEWER_WIDTH = 600; // must match backend FRONTEND_PDF_WIDTH_PX

// ─── Draggable wrapper ───────────────────────────────────────────────────────
function DraggableItem({ children, initialPos, onDragStop }) {
  const nodeRef = useRef(null);
  return (
    <Draggable
      nodeRef={nodeRef}
      defaultPosition={initialPos}
      onStop={(_, data) => onDragStop(data.x, data.y)}
    >
      {/* 👇 YAHAN TOP AUR LEFT ZERO ADD KIYA HAI 👇 */}
      <div ref={nodeRef} style={{ position: "absolute", top: 0, left: 0, cursor: "move" }}>
        {children}
      </div>
    </Draggable>
  );
}

export default function PublicSign() {
  const { token } = useParams();

  // ── Token / file state ────────────────────────────────────────────────────
  const [status, setStatus] = useState("loading"); // loading | valid | invalid | done
  const [invalidMsg, setInvalidMsg] = useState("");
  const [fileUrl, setFileUrl] = useState(null);
  const [fileId, setFileId] = useState(null);
  const [fileName, setFileName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [numPages, setNumPages] = useState(null);

  // ── Editor state ──────────────────────────────────────────────────────────
  const [signatures, setSignatures] = useState([]);   // placed on PDF
  const [savedSignatures, setSavedSignatures] = useState([]); // library
  const [isSaving, setIsSaving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  // Signature creation modal
  const [showSignModal, setShowSignModal] = useState(false);
  const [sigTab, setSigTab] = useState("draw"); // "draw" | "text"
  const [sigText, setSigText] = useState("");
  const [sigFont, setSigFont] = useState("Dancing Script, cursive");

  // Drag-from-library
  const [draggingLib, setDraggingLib] = useState(null);

  // ── IP Fetching state ─────────────────────────────────────────────────────
  const [userIP, setUserIP] = useState(null);
  const [isLoadingIP, setIsLoadingIP] = useState(true);

  const sigCanvasRef = useRef(null);
  const pdfScrollRef = useRef(null); // scrollable container around PDF
  const pdfWrapperRef = useRef(null); // the exact PDF div (600px wide)

  // ── Verify token ───────────────────────────────────────────────────────────
  useEffect(() => {
    const verify = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/invite/${token}`);
        const data = await res.json();
        if (!res.ok || !data.valid) {
          setInvalidMsg(data.message || "Invalid signing link.");
          setStatus("invalid");
          return;
        }
        setFileUrl(data.fileUrl);
        setFileId(data.fileId);
        setFileName(data.fileName);
        setSignerEmail(data.signerEmail);
        setStatus("valid");
      } catch {
        setInvalidMsg("Could not verify this link. Please try again later.");
        setStatus("invalid");
      }
    };
    verify();
  }, [token]);

  // ── Fetch user IP on mount (like Edit.jsx) ────────────────────────────────
  useEffect(() => {
    setIsLoadingIP(true);
    
    // Try ipapi.co first (less likely to be blocked)
    fetch('https://ipapi.co/json/')
      .then(response => response.json())
      .then(data => {
        setUserIP(data.ip);
        setIsLoadingIP(false);
        console.log('📍 User IP detected:', data.ip);
      })
      .catch(error => {
        console.warn('⚠️ Primary IP service failed, trying backup...', error);
        
        // Fallback to ifconfig.me
        fetch('https://ifconfig.me/ip')
          .then(response => response.text())
          .then(ip => {
            setUserIP(ip.trim());
            setIsLoadingIP(false);
            console.log('📍 User IP detected (backup):', ip.trim());
          })
          .catch(backupError => {
            console.warn('⚠️ All IP services failed:', backupError);
            setUserIP('unknown');
            setIsLoadingIP(false);
          });
      });
  }, []);

  // ── Save drawn signature to library ───────────────────────────────────────
  const handleSaveDrawn = useCallback(() => {
    if (!sigCanvasRef.current || sigCanvasRef.current.isEmpty()) {
      toast.error("Please draw your signature first!");
      return;
    }
    const src = sigCanvasRef.current.toDataURL("image/png");
    setSavedSignatures((prev) => [...prev, { id: Date.now(), src, type: "drawn" }]);
    setShowSignModal(false);
    sigCanvasRef.current.clear();
  }, []);

  // ── Save text signature to library ────────────────────────────────────────
  const handleSaveText = useCallback(() => {
    if (!sigText.trim()) {
      toast.error("Please type your name first!");
      return;
    }
    // Render text to a canvas → data URL so it can be embedded in PDF
    const canvas = document.createElement("canvas");
    canvas.width = 300;
    canvas.height = 80;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = `48px ${sigFont}`;
    ctx.fillStyle = "#1e293b";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillText(sigText, 150, 40);
    const src = canvas.toDataURL("image/png");
    setSavedSignatures((prev) => [...prev, { id: Date.now(), src, type: "text", text: sigText }]);
    setShowSignModal(false);
    setSigText("");
  }, [sigText, sigFont]);

  // ── Place signature from library (click) ──────────────────────────────────
  const handlePlaceSignature = useCallback((sig) => {
    setSignatures((prev) => [
      ...prev,
      { id: Date.now(), src: sig.src, x: 50, y: 50, width: 150, height: 60,
        metadata: { timestamp: new Date().toISOString(), signatureType: sig.type || "drawn", ipAddress: userIP || "unknown" } },
    ]);
  }, [userIP]);

  // ── Drag-from-library start ────────────────────────────────────────────────
  const handleDragLibStart = useCallback((e, sig) => {
    setDraggingLib(sig);
    e.dataTransfer.effectAllowed = "copy";
  }, []);

  // ── Drop onto PDF — scroll-aware (FIXED) ──────────────────────────────────
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    if (!draggingLib || !pdfWrapperRef.current) return;
    
    const rect = pdfWrapperRef.current.getBoundingClientRect();
    
    // rect.top aur clientY already scroll ko handle karte hain, inme alag se scroll add nahi karna hai
    const x = e.clientX - rect.left - 75;
    const y = e.clientY - rect.top - 30;
    
    setSignatures((prev) => [
      ...prev,
      { 
        id: Date.now(), 
        src: draggingLib.src,
        x: Math.max(0, x), 
        y: Math.max(0, y),
        width: 150, 
        height: 60,
        metadata: { timestamp: new Date().toISOString(), signatureType: draggingLib.type || "drawn", ipAddress: userIP || "unknown" } 
      },
    ]);
    setDraggingLib(null);
  }, [draggingLib, userIP]);

  // ── Update position after Draggable stop ─────────────────────────────────
  const handleUpdatePos = useCallback((id, x, y) => {
    setSignatures((prev) => prev.map((s) => (s.id === id ? { ...s, x, y } : s)));
  }, []);

  // ── Resize Signature ─────────────────────────────────────────────────────
  const handleResizeSignature = useCallback((id, newWidth, newHeight) => {
    setSignatures(prevSignatures =>
      prevSignatures.map(sig =>
        sig.id === id ? { ...sig, width: newWidth, height: newHeight } : sig
      )
    );
  }, []);

  const handleDelete = useCallback((id) => {
    setSignatures((prev) => prev.filter((s) => s.id !== id));
  }, []);

  // ── Save signed PDF ────────────────────────────────────────────────────────
  const handleSavePdf = useCallback(async () => {
    if (signatures.length === 0) {
      toast.error("Place at least one signature before saving.");
      return;
    }
    setIsSaving(true);
    const toastId = toast.loading("Embedding signature into PDF…");
    try {
      // Helper to map signatures to their respective pages
      const pageNodes = Array.from(pdfWrapperRef.current.querySelectorAll('.react-pdf__Page'));
      
      const mapElementToPage = (el) => {
          const elHeight = el.height || 60; // Approximate height for signatures
          const elCenterY = el.y + (elHeight / 2);
          
          let pageIndex = 0;
          let pageRelativeY = el.y;
          
          for (let i = 0; i < pageNodes.length; i++) {
              const pageNode = pageNodes[i];
              // Traverse up offsetParents until we hit pdfWrapperRef
              let currentElem = pageNode;
              let pageTop = 0;
              while (currentElem && currentElem !== pdfWrapperRef.current && currentElem !== document.body) {
                  pageTop += currentElem.offsetTop;
                  currentElem = currentElem.offsetParent;
              }
              const pageBottom = pageTop + pageNode.offsetHeight;
              
              if (elCenterY >= pageTop && elCenterY <= pageBottom) {
                  return { ...el, pageIndex: i, y: el.y - pageTop };
              }
          }
          
          // Fallback if not strictly inside a page (e.g., in a margin gap)
          let closestIndex = 0;
          let minDistance = Infinity;
          let closestRelativeY = el.y;
          
          for (let i = 0; i < pageNodes.length; i++) {
              const pageNode = pageNodes[i];
              let currentElem = pageNode;
              let pageTop = 0;
              while (currentElem && currentElem !== pdfWrapperRef.current && currentElem !== document.body) {
                  pageTop += currentElem.offsetTop;
                  currentElem = currentElem.offsetParent;
              }
              const pageBottom = pageTop + pageNode.offsetHeight;
              
              let distance = 0;
              if (elCenterY < pageTop) distance = pageTop - elCenterY;
              else if (elCenterY > pageBottom) distance = elCenterY - pageBottom;
              
              if (distance < minDistance) {
                  minDistance = distance;
                  closestIndex = i;
                  closestRelativeY = el.y - pageTop;
              }
          }
          
          return { ...el, pageIndex: closestIndex, y: closestRelativeY };
      };

      const mappedSignatures = signatures.map(mapElementToPage);

      // Send only fileId + signatures as JSON — backend fetches the PDF from Cloudinary directly
      const response = await fetch(`${API_BASE}/api/sign/embed-public`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-invite-token": token,
        },
        body: JSON.stringify({
          fileId,
          signatures: JSON.stringify(mappedSignatures),
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Signing failed.");

      toast.success("Document signed successfully!", { id: toastId });
      setStatus("done");
    } catch (err) {
      toast.error(err.message || "Failed to save PDF.", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  }, [signatures, fileId, token]);

  // ── Reject Document ──────────────────────────────────────────────────────
  const handleReject = useCallback(async () => {
    if (!window.confirm("Are you sure you want to reject this signature request? The sender will be notified.")) {
      return;
    }

    setIsRejecting(true);
    const toastId = toast.loading("Rejecting document...");
    try {
      const response = await fetch(`${API_BASE}/api/invite/${token}/reject`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Failed to reject.");

      toast.success("Document rejected.", { id: toastId });
      setStatus("rejected");
    } catch (err) {
      toast.error(err.message || "Failed to reject document.", { id: toastId });
    } finally {
      setIsRejecting(false);
    }
  }, [token]);


  // ── States: loading / invalid / done / rejected ──────────────────────────
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Verifying your signing link…</p>
        </div>
      </div>
    );
  }
  if (status === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-10 text-center max-w-sm w-full">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Link Unavailable</h2>
          <p className="text-slate-500 text-sm">{invalidMsg}</p>
        </div>
      </div>
    );
  }
  if (status === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="bg-white rounded-2xl shadow-xl border border-emerald-200 p-10 text-center max-w-sm w-full">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Document Signed!</h2>
          <p className="text-slate-500 text-sm">Thank you. The document has been signed and delivered securely.</p>
        </div>
      </div>
    );
  }
  if (status === "rejected") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="bg-white rounded-2xl shadow-xl border border-red-200 p-10 text-center max-w-sm w-full">
          <div className="text-5xl mb-4">❌</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Document Rejected</h2>
          <p className="text-slate-500 text-sm">You have successfully declined to sign this document. The sender has been notified.</p>
        </div>
      </div>
    );
  }

  // ── Editor ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Top bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm truncate max-w-xs">{fileName}</p>
            <p className="text-xs text-slate-400">Signing as {signerEmail}</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          {/* Reject Button */}
          <button
            onClick={handleReject}
            disabled={isSaving || isRejecting}
            className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all duration-200 shadow-sm
              ${isSaving || isRejecting
                ? "border-slate-200 text-slate-400 cursor-not-allowed"
                : "border-red-500 text-red-600 hover:bg-red-50"
              }
            `}
          >
            {isRejecting ? "Rejecting..." : "Reject Document"}
          </button>

          {/* Sign & Save Button */}
          <button
            onClick={handleSavePdf}
            disabled={isSaving || isRejecting || signatures.length === 0}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white transition-all duration-200 shadow-md
              ${isSaving || isRejecting || signatures.length === 0
                ? "bg-indigo-300 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg active:scale-95"
              }
            `}
          >
            {isSaving ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Saving…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Sign &amp; Save
            </>
          )}
        </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── PDF area ── */}
        <div
          ref={pdfScrollRef}
          className="flex-1 overflow-auto p-8 flex justify-center bg-gray-200"
        >
          <div
            ref={pdfWrapperRef}
            className="relative bg-white shadow-2xl border border-gray-300 select-none"
            style={{ width: VIEWER_WIDTH, minHeight: 400 }}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }}
            onDrop={handleDrop}
          >
            <Document
              file={fileUrl}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              loading={<div className="h-96 flex items-center justify-center text-slate-400">Loading PDF…</div>}
            >
              {Array.from(new Array(numPages), (el, index) => (
                <div key={`page_${index + 1}`} className="mb-4 shadow-sm bg-white">
                  <Page 
                    pageNumber={index + 1} 
                    width={VIEWER_WIDTH} 
                    renderTextLayer={false} 
                    renderAnnotationLayer={false} 
                  />
                </div>
              ))}
            </Document>

            {signatures.map((sig) => (
              <DraggableItem
                key={sig.id}
                initialPos={{ x: sig.x, y: sig.y }}
                onDragStop={(x, y) => handleUpdatePos(sig.id, x, y)}
              >
                <div 
                  className="group relative cursor-move" 
                  style={{ width: sig.width || 150, height: sig.height || 60, padding: 0 }}
                >
                  <img src={sig.src} alt="sig" className="w-full h-full object-contain pointer-events-none select-none block" draggable={false} style={{ margin: 0, padding: 0 }} />
                  <div className="absolute inset-0 border-2 border-transparent group-hover:border-blue-400 rounded pointer-events-none" />
                  <button
                    onClick={() => handleDelete(sig.id)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
                    title="Delete signature"
                  >✕</button>

                  {/* Resize handle */}
                  <div
                    className="absolute bottom-0 right-0 w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity"
                    onMouseDown={(e) => {
                      e.stopPropagation(); // Prevent dragging when resizing
                      const startX = e.clientX;
                      const startY = e.clientY;
                      const startWidth = sig.width || 150;
                      const startHeight = sig.height || 60;
                      
                      const handleMouseMove = (moveEvent) => {
                        const deltaX = moveEvent.clientX - startX;
                        const deltaY = moveEvent.clientY - startY;
                        const newWidth = Math.max(50, startWidth + deltaX);  // Min width 50px
                        const newHeight = Math.max(30, startHeight + deltaY); // Min height 30px
                        handleResizeSignature(sig.id, newWidth, newHeight);
                      };
                      
                      const handleMouseUp = () => {
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                      };
                      
                      document.addEventListener('mousemove', handleMouseMove);
                      document.addEventListener('mouseup', handleMouseUp);
                    }}
                    style={{ cursor: 'nwse-resize' }}
                    title="Drag to resize"
                  >
                    {/* Three diagonal lines icon */}
                    <svg className="w-full h-full" viewBox="0 0 12 12" fill="none">
                      <line x1="12" y1="6" x2="6" y2="12" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round"/>
                      <line x1="12" y1="2" x2="2" y2="12" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round"/>
                      <line x1="12" y1="10" x2="10" y2="12" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>

                </div>
              </DraggableItem>
            ))}
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div className="w-72 bg-white shadow-xl border-l border-gray-200 p-5 flex flex-col gap-4 z-20 overflow-y-auto flex-shrink-0">
          <h2 className="text-base font-bold text-gray-800 border-b pb-2">Signing Tools</h2>

          {/* Create signature button */}
          <button
            onClick={() => setShowSignModal(true)}
            className="flex items-center gap-3 w-full px-4 py-3 bg-indigo-50 text-indigo-700 border-2 border-indigo-200 rounded-xl hover:bg-indigo-100 hover:border-indigo-400 transition-all"
          >
            <span className="text-2xl">✍️</span>
            <div className="text-left">
              <div className="font-semibold text-sm">Create Signature</div>
              <div className="text-xs text-gray-400">Draw or type</div>
            </div>
          </button>

          {/* Signature library */}
          {savedSignatures.length > 0 && (
            <div className="border-t pt-3">
              <p className="text-xs font-bold text-gray-500 uppercase mb-2">My Signatures — drag or click to place</p>
              <div className="flex flex-col gap-2">
                {savedSignatures.map((sig) => (
                  <div
                    key={sig.id}
                    draggable
                    onDragStart={(e) => handleDragLibStart(e, sig)}
                    onDragEnd={() => setDraggingLib(null)}
                    onClick={() => handlePlaceSignature(sig)}
                    className="border-2 border-gray-200 rounded-xl p-2 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50 transition-all cursor-grab active:cursor-grabbing"
                    title="Drag onto PDF or click to place at default position"
                  >
                    <img src={sig.src} alt="sig" className="w-full h-12 object-contain" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Placement count hint */}
          {signatures.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-700 mt-auto">
              <strong>{signatures.length}</strong> signature{signatures.length > 1 ? "s" : ""} placed.
              Click <strong>Sign &amp; Save</strong> when ready.
            </div>
          )}

          {savedSignatures.length === 0 && (
            <p className="text-xs text-slate-400 text-center mt-4">
              Create a signature above, then drag it onto the document.
            </p>
          )}
        </div>
      </div>

      {/* ── Signature creation modal ── */}
      {showSignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Create Signature</h3>
              <button onClick={() => setShowSignModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4">
              {[["draw", "✏️ Draw"], ["text", "🔤 Type"]].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSigTab(key)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                    sigTab === key ? "bg-white shadow text-indigo-600" : "text-gray-500 hover:text-gray-700"
                  }`}
                >{label}</button>
              ))}
            </div>

            {sigTab === "draw" && (
              <>
                <div className="border-2 border-gray-300 rounded-xl overflow-hidden bg-white mb-3">
                  <SignatureCanvas
                    ref={sigCanvasRef}
                    penColor="#1e293b"
                    canvasProps={{ width: 420, height: 150, style: { display: "block" } }}
                  />
                </div>
                <p className="text-xs text-gray-400 mb-3">Draw your signature above using your mouse or finger.</p>
                <div className="flex gap-2">
                  <button onClick={() => sigCanvasRef.current?.clear()} className="flex-1 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50">Clear</button>
                  <button onClick={handleSaveDrawn} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700">Save Signature</button>
                </div>
              </>
            )}

            {sigTab === "text" && (
              <>
                <input
                  type="text"
                  placeholder="Type your full name…"
                  value={sigText}
                  onChange={(e) => setSigText(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 mb-3"
                />
                {/* Font selector */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[
                    ["Dancing Script, cursive", "Cursive"],
                    ["Pacifico, cursive", "Pacifico"],
                    ["Caveat, cursive", "Handwritten"],
                    ["serif", "Classic"],
                  ].map(([f, label]) => (
                    <button
                      key={f}
                      onClick={() => setSigFont(f)}
                      className={`border-2 rounded-lg py-2 px-3 text-left text-sm transition-all ${
                        sigFont === f ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:border-gray-400"
                      }`}
                      style={{ fontFamily: f }}
                    >
                      {sigText || "Your Name"} <span className="block text-xs text-gray-400 font-sans">{label}</span>
                    </button>
                  ))}
                </div>
                {/* Preview */}
                {sigText && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-3 text-center" style={{ fontFamily: sigFont, fontSize: 28, color: "#1e293b" }}>
                    {sigText}
                  </div>
                )}
                <button onClick={handleSaveText} className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700">
                  Save Signature
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
