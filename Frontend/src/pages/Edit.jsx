import { useState, useRef, useCallback, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import Draggable from "react-draggable";
import Navbar from "../component/Navbar";
import SignatureCanvas from 'react-signature-canvas';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import "pdfjs-dist/build/pdf.worker.min.mjs";

// ========================================
// PDF.js Worker Configuration
// ========================================
// This tells pdf.js where to find the worker file that handles PDF parsing in a separate thread
// This prevents the main UI thread from freezing when loading large PDFs
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

/**
 * ========================================
 * EDIT COMPONENT - Main PDF Editor
 * ========================================
 * This component provides a full-featured PDF editor with:
 * - Signature drawing and placement
 * - Text addition and editing
 * - Drag-and-drop positioning for all elements
 * - Delete capabilities for signatures and text
 * 
 * @param {string} path - URL or path to the PDF file to edit
 */
export default function Edit({ path }) {
  // ========================================
  // STATE MANAGEMENT
  // ========================================
  
  // PDF-related state
  const [numPages, setNumPages] = useState(null);          // Total number of pages in the PDF
  const [pdfWidth, setPdfWidth] = useState(600);           // Width of the PDF viewer (adjustable)

  // Signature Library - stores saved signatures that can be reused
  // Each saved signature has: { id, src (base64 image), name (optional) }
  const [savedSignatures, setSavedSignatures] = useState([]);
  
  // Signatures array - stores all signature objects placed on the PDF
  // Each signature has: { id, src (base64 image), x, y (position), width, height (size) }
  const [signatures, setSignatures] = useState([]);
  
  // Text elements array - stores all text boxes placed on the PDF
  // Each text has: { id, content, font, fontSize, x, y }
  const [texts, setTexts] = useState([]);
  
  // Modal visibility state for the signature drawing interface
  const [showSignModal, setShowSignModal] = useState(false);
  
  // Modal visibility state for text signature creation
  const [showTextSignModal, setShowTextSignModal] = useState(false);
  
  // Text signature input state
  const [textSignatureInput, setTextSignatureInput] = useState("");
  const [textSignatureFont, setTextSignatureFont] = useState("Brush Script MT");
  
  // Drag-and-drop state - tracks which signature is being dragged
  const [draggedSignature, setDraggedSignature] = useState(null);
  
  // User's IP address for metadata tracking
  const [userIP, setUserIP] = useState(null);
  const [isLoadingIP, setIsLoadingIP] = useState(true);
  
  // ========================================
  // REFS - Direct DOM access for canvas and PDF container
  // ========================================
  const sigCanvasRef = useRef(null);      // Reference to the signature canvas element
  const pdfWrapperRef = useRef(null);     // Reference to the PDF container for bounds checking

  // ========================================
  // SIGNATURE HANDLING
  // ========================================
  
  /**
   * Saves the drawn signature to the signature library (not placed on PDF yet)
   * This function:
   * 1. Validates that something was actually drawn
   * 2. Converts the canvas drawing to a PNG image
   * 3. Adds the signature to the savedSignatures library
   * 4. Closes the modal
   */
  const handleSaveSignature = useCallback(() => {
    console.log("🖊️ Save to Library button clicked!");
    
    try {
      // Safety check: ensure canvas ref exists
      if (!sigCanvasRef.current) {
        console.error("❌ Signature canvas ref is not available");
        alert("Error: Canvas not ready. Please try again.");
        return;
      }

      console.log("✅ Canvas ref exists:", sigCanvasRef.current);

      // Validation: Don't allow empty signatures
      if (sigCanvasRef.current.isEmpty()) {
        console.warn("⚠️ Canvas is empty");
        alert("Please draw your signature first!");
        return;
      }

      console.log("✅ Signature drawn, converting to image...");

      // Convert the drawn signature to a base64 PNG image
      const dataURL = sigCanvasRef.current.toDataURL('image/png');
      
      console.log("✅ Image converted, dataURL length:", dataURL.length);
      
      // Add the new signature to the saved signatures library
      // Using Date.now() as a simple unique ID generator
      const newSavedSignature = { 
        id: Date.now(), 
        src: dataURL,     // Base64 PNG image
      };
      
      console.log("✅ Adding signature to library:", newSavedSignature.id);
      
      setSavedSignatures(prevSaved => {
        const updated = [...prevSaved, newSavedSignature];
        console.log("✅ Signature library updated, total count:", updated.length);
        return updated;
      });
      
      // Close the signature modal
      setShowSignModal(false);
      console.log("✅ Signature saved to library and modal closed!");
      
    } catch (error) {
      console.error("❌ Error saving signature:", error);
      alert("An error occurred while saving the signature. Check console for details.");
    }
  }, []);

  /**
   * Places a signature from the library onto the PDF at default position
   * Creates a new instance that can be moved and resized independently
   * @param {Object} signatureData - The saved signature to place
   */
  const handlePlaceSignature = useCallback((signatureData) => {
    console.log("📍 Placing signature on PDF:", signatureData.id);
    
    const newPdfSignature = {
      id: Date.now(), 
      src: signatureData.src,
      x: 50,  
      y: 50,
      width: 120,
      height: 60,
      // Hidden metadata for audit/verification
      metadata: {
        ipAddress: userIP || 'unknown',
        timestamp: new Date().toISOString(),
        signatureType: signatureData.type || 'drawn'
      }
    };
    
    setSignatures(prevSignatures => [...prevSignatures, newPdfSignature]);
    console.log("✅ Signature placed on PDF at (50, 50) with metadata:", newPdfSignature.metadata);
  }, [userIP]);

  /**
   * Deletes a signature from the saved library
   * (Does not affect signatures already placed on PDF)
   * @param {number} id - ID of the signature to remove from library
   */
  const handleDeleteSavedSignature = useCallback((id) => {
    console.log("🗑️ Deleting signature from library:", id);
    setSavedSignatures(prevSaved => prevSaved.filter(sig => sig.id !== id));
  }, []);

  /**
   * Converts text to a canvas image for text signatures
   * This ensures consistency between drawn and text signatures
   * @param {string} text - The text to convert
   * @param {string} fontFamily - Font family to use
   * @returns {string} Base64 PNG image data URL
   */
  const textToImage = useCallback((text, fontFamily) => {
    // Create a temporary canvas for measuring
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set font to measure text dimensions
    const fontSize = 48;
    ctx.font = `${fontSize}px "${fontFamily}", cursive`;
    
    // Measure the actual text width
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = fontSize; // Approximate height
    
    // Set canvas size with minimal padding (10px on each side)
    const padding = 10;
    canvas.width = textWidth + (padding * 2);
    canvas.height = textHeight + (padding * 2);
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Reconfigure text styling (font gets reset after canvas resize)
    ctx.font = `${fontSize}px "${fontFamily}", cursive`;
    ctx.fillStyle = 'black';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    
    // Draw text in center of tightly-sized canvas
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    
    // Convert canvas to base64 image
    return canvas.toDataURL('image/png');
  }, []);

  /**
   * Saves a text signature to the library
   * Converts the text to an image using canvas
   */
  const handleSaveTextSignature = useCallback(() => {
    console.log("🖊️ Save text signature clicked");
    
    if (!textSignatureInput.trim()) {
      alert("Please enter your signature text!");
      return;
    }
    
    try {
      // Convert text to image
      const imageData = textToImage(textSignatureInput, textSignatureFont);
      
      // Create signature object with type indicator
      const newTextSignature = {
        id: Date.now(),
        src: imageData,
        type: 'text', // Mark as text signature
        originalText: textSignatureInput, // Store original text
        font: textSignatureFont
      };
      
      console.log("✅ Text signature created:", newTextSignature.id);
      
      // Add to saved signatures
      setSavedSignatures(prevSaved => [...prevSaved, newTextSignature]);
      
      // Reset and close modal
      setTextSignatureInput("");
      setShowTextSignModal(false);
      console.log("✅ Text signature saved to library");
      
    } catch (error) {
      console.error("❌ Error creating text signature:", error);
      alert("Error creating text signature. Please try again.");
    }
  }, [textSignatureInput, textSignatureFont, textToImage]);

  // ========================================
  // DRAG-AND-DROP HANDLING
  // ========================================
  
  /**
   * Handles when user starts dragging a signature from the library
   * @param {DragEvent} e - Drag event
   * @param {Object} signatureData - The signature being dragged
   */
  const handleDragStart = useCallback((e, signatureData) => {
    console.log("🎯 Drag started:", signatureData.id);
    setDraggedSignature(signatureData);
    // Set drag image (optional - makes the dragged element look better)
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  /**
   * Handles when drag ends (whether dropped or cancelled)
   */
  const handleDragEnd = useCallback(() => {
    console.log("🏁 Drag ended");
    setDraggedSignature(null);
  }, []);

  /**
   * Handles when user drags over the PDF container
   * Must prevent default to allow dropping
   */
  const handleDragOver = useCallback((e) => {
    e.preventDefault(); // Critical: allows drop event to fire
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  /**
   * Handles when user drops a signature onto the PDF
   * Calculates the drop position and places the signature
   */
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    
    if (!draggedSignature) {
      console.warn("⚠️ No signature being dragged");
      return;
    }

    // Get the PDF container's position and size
    const pdfContainer = pdfWrapperRef.current;
    if (!pdfContainer) {
      console.error("❌ PDF container not found");
      return;
    }

    const rect = pdfContainer.getBoundingClientRect();
    
    // Calculate drop position relative to PDF container
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    console.log(`📍 Dropped at (${x}, ${y}) relative to PDF`);
    
    // Create a new signature instance at the drop position
    const newPdfSignature = {
      id: Date.now(),
      src: draggedSignature.src,
      x: x - 60,
      y: y - 30,
      width: 120,
      height: 60,
      // Hidden metadata for audit/verification
      metadata: {
        ipAddress: userIP || 'unknown',
        timestamp: new Date().toISOString(),
        signatureType: draggedSignature.type || 'drawn'
      }
    };
    
    setSignatures(prevSignatures => [...prevSignatures, newPdfSignature]);
    console.log(`✅ Signature placed at (${newPdfSignature.x}, ${newPdfSignature.y}) with metadata:`, newPdfSignature.metadata);
    
    // Clear dragged state
    setDraggedSignature(null);
  }, [draggedSignature, userIP]);

  /**
   * Handles resizing of signatures
   * @param {number} id - Signature ID
   * @param {number} newWidth - New width
   * @param {number} newHeight - New height
   */
  const handleResizeSignature = useCallback((id, newWidth, newHeight) => {
    setSignatures(prevSignatures =>
      prevSignatures.map(sig =>
        sig.id === id ? { ...sig, width: newWidth, height: newHeight } : sig
      )
    );
  }, []);

  /**
   * Clears the signature canvas
   * Allows users to redraw if they make a mistake
   */
  const handleClearSignature = useCallback(() => {
    if (sigCanvasRef.current) {
      sigCanvasRef.current.clear();
    }
  }, []);

  // On component mount, fetch user's IP address for metadata
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
  }, []); // Empty dependency array = run once on mount

  // ========================================
  // TEXT HANDLING
  // ========================================
  
  /**
   * Adds a new text element to the PDF
   * Creates a default text box that users can edit and move
   */
  const handleAddText = useCallback(() => {
    setTexts(prevTexts => [...prevTexts, { 
      id: Date.now(), 
      content: "Double Click to Edit", 
      font: "font-sans",     // Tailwind font class
      fontSize: 16,          // Font size in pixels
      x: 0, 
      y: 0 
    }]);
  }, []);

  /**
   * Updates the text content of a specific text element
   * @param {number} id - Unique ID of the text element
   * @param {string} newContent - New text content
   */
  const updateText = useCallback((id, newContent) => {
    setTexts(prevTexts => 
      prevTexts.map(t => t.id === id ? { ...t, content: newContent } : t)
    );
  }, []);

  /**
   * Changes the font family of a text element
   * @param {number} id - Unique ID of the text element
   * @param {string} newFont - New Tailwind font class
   */
  const changeFont = useCallback((id, newFont) => {
    setTexts(prevTexts => 
      prevTexts.map(t => t.id === id ? { ...t, font: newFont } : t)
    );
  }, []);

  // ========================================
  // DELETION HANDLING
  // ========================================
  
  /**
   * Deletes a signature or text element from the PDF
   * @param {string} type - Either 'sig' for signature or 'text' for text element
   * @param {number} id - Unique ID of the element to delete
   */
  const deleteElement = useCallback((type, id) => {
    if (type === 'sig') {
      setSignatures(prevSigs => prevSigs.filter(s => s.id !== id));
    } else if (type === 'text') {
      setTexts(prevTexts => prevTexts.filter(t => t.id !== id));
    }
  }, []);

  // ========================================
  // RENDER - Main UI Structure
  // ========================================
  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Navigation bar */}
      <Navbar />
      
      {/* Main layout: PDF viewer on left, toolbar on right */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* ========================================
            LEFT PANEL - PDF VIEWER & CANVAS
            ======================================== */}
        <div className="flex-1 overflow-auto p-8 flex justify-center bg-gray-200">
          {/* PDF Container - This is the draggable bounds for signatures and text */}
          <div 
            ref={pdfWrapperRef}
            className="relative bg-white shadow-2xl border border-gray-300"
            style={{ width: pdfWidth, height: 'fit-content' }}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {/* PDF Document Renderer */}
            <Document
              file={path || "https://pdfobject.com/pdf/sample.pdf"} 
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              loading={<div className="h-96 flex items-center justify-center">Loading PDF...</div>}
            >
              {/* Currently showing only page 1 - could be extended for multi-page support */}
              <Page 
                pageNumber={1} 
                width={pdfWidth} 
                renderTextLayer={false}        // Disable text selection layer for cleaner editing
                renderAnnotationLayer={false}   // Disable annotation layer
              />
            </Document>

            {/* ========================================
                SIGNATURE LAYER
                All signatures are rendered as draggable, resizable images
                ======================================== */}
            {signatures.map((sig) => (
              <DraggableItem key={sig.id} initialPos={{x: sig.x, y: sig.y}}>
                {/* Signature container with hover effects and resize handle */}
                <div 
                  className="group relative cursor-move"
                  style={{ 
                    width: sig.width || 120, 
                    height: sig.height || 60,
                    padding: 0  // No padding
                  }}
                >
                  {/* Signature image with object-fit to maintain aspect ratio */}
                  <img 
                    src={sig.src} 
                    alt="signature" 
                    className="w-full h-full object-contain pointer-events-none select-none block" 
                    draggable={false}
                    style={{ margin: 0, padding: 0 }}
                  />
                  
                  {/* Border visible on hover */}
                  <div className="absolute inset-0 border-2 border-transparent group-hover:border-blue-400 pointer-events-none rounded" />
                  
                  {/* Delete button - only visible on hover */}
                  <button 
                    onClick={() => deleteElement('sig', sig.id)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
                    title="Delete signature"
                  >
                    ✕
                  </button>
                  
                  {/* Resize handle - bottom-right corner (smaller and elegant) */}
                  <div
                    className="absolute bottom-0 right-0 w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity"
                    onMouseDown={(e) => {
                      e.stopPropagation(); // Prevent dragging when resizing
                      const startX = e.clientX;
                      const startY = e.clientY;
                      const startWidth = sig.width || 120;
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

            {/* ========================================
                TEXT LAYER
                All text elements are rendered as editable inputs
                ======================================== */}
            {texts.map((textItem) => (
              <DraggableItem key={textItem.id} initialPos={{x: textItem.x, y: textItem.y}}>
                 {/* Text container with hover effects */}
                 <div className="group relative inline-block hover:border-2 hover:border-blue-500 cursor-move p-1">
                    {/* Editable text input */}
                    <input 
                      type="text"
                      value={textItem.content}
                      onChange={(e) => updateText(textItem.id, e.target.value)}
                      className={`bg-transparent outline-none w-auto min-w-[100px] ${textItem.font}`}
                      style={{ fontSize: textItem.fontSize }}
                      placeholder="Enter text..."
                    />
                    
                    {/* Text Controls Panel - appears below text on hover */}
                    <div className="absolute top-full left-0 mt-1 hidden group-hover:flex gap-2 bg-white shadow-lg p-2 rounded z-50 border border-gray-200">
                       {/* Font selector */}
                       <select 
                         className="text-xs border p-1 rounded hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
                         onChange={(e) => changeFont(textItem.id, e.target.value)}
                         value={textItem.font}
                         title="Change font"
                       >
                         <option value="font-sans">Sans Serif</option>
                         <option value="font-serif">Serif</option>
                         <option value="font-mono">Monospace</option>
                       </select>
                       
                       {/* Delete button */}
                       <button 
                         onClick={() => deleteElement('text', textItem.id)}
                         className="text-red-500 text-xs font-bold px-2 py-1 hover:bg-red-50 rounded"
                         title="Delete text"
                       >
                         🗑️ Delete
                       </button>
                    </div>
                 </div>
              </DraggableItem>
            ))}

          </div>
        </div>

        {/* ========================================
            RIGHT PANEL - TOOLBAR (Scrollable)
            ======================================== */}
        <div className="w-80 bg-white shadow-xl border-l border-gray-200 p-6 flex flex-col gap-6 z-20 overflow-y-auto max-h-screen">
            <h2 className="text-xl font-bold text-gray-800 border-b pb-2">Editing Tools</h2>

            {/* IP Address Status Indicator */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs">
              <div className="flex items-center gap-2">
                {isLoadingIP ? (
                  <>
                    {/* Loading spinner */}
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-gray-600">Loading IP address...</span>
                  </>
                ) : userIP === 'unknown' ? (
                  <>
                    <span className="text-red-500">⚠️</span>
                    <span className="text-gray-600">IP: Failed to detect</span>
                  </>
                ) : (
                  <>
                    <span className="text-green-500">✓</span>
                    <span className="text-gray-600">IP: <span className="font-mono font-semibold">{userIP}</span></span>
                  </>
                )}
              </div>
            </div>

            {/* Tool buttons */}
            <div className="flex flex-col gap-4">
              {/* Add Signature Button */}
              <button 
                onClick={() => setShowSignModal(true)}
                className="flex items-center gap-3 w-full px-4 py-3 bg-blue-50 text-blue-700 border-2 border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-400 transition-all shadow-sm hover:shadow-md"
              >
                 <span className="text-2xl">🖌️</span>
                 <div className="text-left">
                    <div className="font-semibold">Draw Signature</div>
                    <div className="text-xs text-gray-500">Save to library</div>
                 </div>
              </button>

              {/* Type Signature Button */}
              <button 
                onClick={() => setShowTextSignModal(true)}
                className="flex items-center gap-3 w-full px-4 py-3 bg-purple-50 text-purple-700 border-2 border-purple-200 rounded-lg hover:bg-purple-100 hover:border-purple-400 transition-all shadow-sm hover:shadow-md"
              >
                 <span className="text-2xl">✒️</span>
                 <div className="text-left">
                    <div className="font-semibold">Type Signature</div>
                    <div className="text-xs text-gray-500">Create from text</div>
                 </div>
              </button>
            </div>

            {/* ========================================
                SIGNATURE LIBRARY PANEL
                Shows all saved signatures that can be placed on PDF
                ======================================== */}
            {savedSignatures.length > 0 && (
              <div className="border-t pt-4">
                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <span>✍️ My Signatures</span>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    {savedSignatures.length}
                  </span>
                </h3>
                
                {/* Signature Grid */}
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {savedSignatures.map((sig) => (
                    <div
                      key={sig.id}
                      className="group relative border-2 border-gray-200 rounded-lg p-2 hover:border-blue-400 hover:bg-blue-50 transition-all cursor-grab active:cursor-grabbing"
                      draggable="true"
                      onDragStart={(e) => handleDragStart(e, sig)}
                      onDragEnd={handleDragEnd}
                      onClick={() => handlePlaceSignature(sig)}
                      title="Drag to PDF or click to place"
                    >
                      {/* Signature thumbnail */}
                      <img 
                        src={sig.src} 
                        alt="saved signature" 
                        className="w-full h-12 object-contain pointer-events-none"
                        draggable="false"
                      />
                      
                      {/* Delete button - appears on hover */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent triggering place action
                          handleDeleteSavedSignature(sig.id);
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
                        title="Delete from library"
                      >
                        ✕
                      </button>
                      
                      {/* Drag hint - appears on hover */}
                      <div className="absolute inset-0 flex items-center justify-center bg-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg pointer-events-none">
                        <span className="text-xs font-semibold text-blue-700 bg-white px-2 py-1 rounded shadow">
                          Drag or Click
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                
                <p className="text-xs text-gray-500 mt-2 text-center">
                  💡 Drag signatures onto the PDF or click to place
                </p>
              </div>
            )}

            {/* Info section */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-gray-700">
              <p className="font-semibold text-blue-800 mb-2">💡 Quick Tips:</p>
              <ul className="space-y-1 text-xs">
                <li>• Drag signatures from library to PDF</li>
                <li>• Draw or type your signature to save it</li>
                <li>• Drag to reposition after placing</li>
              </ul>
            </div>

            {/* Save button at bottom */}
            <div className="mt-auto border-t pt-4">
               <button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-bold hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg transition-all">
                  💾 Save PDF
               </button>
            </div>
        </div>

      </div>

      {/* ========================================
          SIGNATURE MODAL - Drawing Interface
          ======================================== */}
      {showSignModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          {/* Modal container */}
          <div className="bg-white p-8 rounded-2xl shadow-2xl w-[600px] max-w-[90vw]">
            <h3 className="text-2xl font-bold mb-2 text-gray-800">✍️ Draw Your Signature</h3>
            <p className="text-sm text-gray-500 mb-4">Use your mouse or touchscreen to draw</p>
            
            {/* Canvas container - larger size for better drawing experience */}
            <div className="border-2 border-dashed border-gray-300 rounded-xl bg-gradient-to-br from-gray-50 to-white mb-6 relative overflow-hidden">
              {/* Signature Canvas Component 
                  Key optimizations:
                  - Fixed width/height for consistent rendering
                  - Proper DPI scaling via canvasProps
                  - Transparent background for clean signature extraction
              */}
              <SignatureCanvas 
                ref={sigCanvasRef} 
                penColor="black"
                backgroundColor="rgba(255,255,255,0)"  // Fully transparent background
                canvasProps={{ 
                  width: 552,   // Fixed width for optimal performance (600px - 48px padding)
                  height: 300,  // Larger height for comfortable drawing
                  className: 'w-full h-full cursor-crosshair' 
                }} 
                velocityFilterWeight={0.7}  // Smoothness of the pen stroke (0-1)
                minWidth={0.5}               // Minimum pen width
                maxWidth={2.5}               // Maximum pen width (pressure-sensitive)
              />
              {/* Helpful hint text */}
              <div className="absolute bottom-3 right-3 text-xs text-gray-400 pointer-events-none bg-white/80 px-2 py-1 rounded">
                ✨ Sign here
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-3">
              {/* Clear button - lets users redraw */}
              <button 
                onClick={handleClearSignature}
                className="px-5 py-2.5 text-red-600 hover:bg-red-50 rounded-lg border border-red-200 font-medium transition-colors"
                title="Clear and start over"
              >
                🗑️ Clear
              </button>
              
              {/* Cancel button - closes modal without saving */}
              <button 
                onClick={() => setShowSignModal(false)}
                className="px-5 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg border border-gray-300 font-medium transition-colors"
              >
                Cancel
              </button>
              
              {/* Save to Library button - saves signature and adds to toolbar */}
              <button 
                onClick={handleSaveSignature}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg transition-all"
              >
                ✓ Save to Library
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================
          TEXT SIGNATURE MODAL - Type Your Name
          ======================================== */}
      {showTextSignModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          {/* Modal container */}
          <div className="bg-white p-8 rounded-2xl shadow-2xl w-[600px] max-w-[90vw]">
            <h3 className="text-2xl font-bold mb-2 text-gray-800">✒️ Type Your Signature</h3>
            <p className="text-sm text-gray-500 mb-4">Enter your name and choose a font style</p>
            
            {/* Input field */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Your Signature Text
              </label>
              <input
                type="text"
                value={textSignatureInput}
                onChange={(e) => setTextSignatureInput(e.target.value)}
                placeholder="Enter your name..."
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-lg"
                autoFocus
              />
            </div>

            {/* Font selector */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Font Style
              </label>
              <select
                value={textSignatureFont}
                onChange={(e) => setTextSignatureFont(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-base"
              >
                <option value="Brush Script MT">Brush Script (Elegant)</option>
                <option value="Lucida Handwriting">Lucida Handwriting (Classic)</option>
                <option value="Segoe Script">Segoe Script (Modern)</option>
                <option value="Monotype Corsiva">Corsiva (Formal)</option>
                <option value="Freestyle Script">Freestyle (Casual)</option>
              </select>
            </div>

            {/* Live preview */}
            {textSignatureInput && (
              <div className="mb-6 border-2 border-dashed border-purple-200 rounded-xl bg-gradient-to-br from-purple-50 to-white p-6 min-h-[100px] flex items-center justify-center">
                <div 
                  style={{ 
                    fontFamily: `"${textSignatureFont}", cursive`,
                    fontSize: '48px',
                    color: '#000'
                  }}
                >
                  {textSignatureInput}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex justify-end gap-3">
              {/* Cancel button */}
              <button 
                onClick={() => {
                  setShowTextSignModal(false);
                  setTextSignatureInput("");
                }}
                className="px-5 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg border border-gray-300 font-medium transition-colors"
              >
                Cancel
              </button>
              
              {/* Save to Library button */}
              <button 
                onClick={handleSaveTextSignature}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-purple-800 shadow-md hover:shadow-lg transition-all"
              >
                ✓ Save to Library
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * ========================================
 * DRAGGABLE ITEM WRAPPER COMPONENT
 * ========================================
 * This wrapper provides drag-and-drop functionality for signatures and text
 * 
 * Key features:
 * - Uses nodeRef to avoid React 18 warnings with findDOMNode
 * - Bounds to parent (PDF container) to prevent dragging outside
 * - Absolute positioning for overlay on PDF
 * 
 * @param {ReactNode} children - The element to make draggable (signature or text)
 * @param {Object} initialPos - Starting position {x, y} on the PDF
 */
const DraggableItem = ({ children, initialPos }) => {
  // nodeRef is required in React 18+ to avoid findDOMNode deprecation warnings
  const nodeRef = useRef(null);
  
  return (
    <Draggable 
      nodeRef={nodeRef}                    // Pass ref directly to avoid findDOMNode
      defaultPosition={initialPos}         // Starting position from state
      bounds="parent"                      // Constrain dragging to PDF container
      cancel="input,button,select"         // Don't drag when interacting with these elements
    >
      {/* Absolutely positioned wrapper that sits on top of the PDF */}
      <div ref={nodeRef} className="absolute top-0 left-0 z-10">
        {children}
      </div>
    </Draggable>
  );
};