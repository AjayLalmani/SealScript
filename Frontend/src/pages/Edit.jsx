import { useState, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import Draggable from "react-draggable"; 
import Navbar from "../component/Navbar";

// CSS zaroori hai formatting ke liye
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// ----------------------------------------------------------
// WORKER SETUP (Local File Strategy - No Internet Needed)
// ----------------------------------------------------------
import "pdfjs-dist/build/pdf.worker.min.mjs";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export default function Edit({path}) {
  const [numPages, setNumPages] = useState(null);
  
  // PDF ka size (responsive rakhne ke liye)
  const [pdfWidth, setPdfWidth] = useState(600);

  // React 19 compatibility ke liye nodeRef
  const nodeRef = useRef(null);

  return (
    <>
    <Navbar/>
    <div className="flex flex-col items-center mt-5">
      
      <h3 className="text-lg font-semibold mb-4">Drag the Signature onto the PDF</h3>

      <div 
        className="relative border border-gray-300 select-none"
        style={{ width: pdfWidth }}
      >

        {/* 1. PDF Layer (Background) */}
        <Document
          file={{
              url: path,
              withCredentials: false 
          }}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          onLoadError={(error) => console.error("Error:", error)}
          loading={<div>Loading PDF...</div>}
        >
          <Page 
            pageNumber={1} 
            width={pdfWidth} 
            renderTextLayer={false} // Text layer disable kar sakte hain agar slow ho
            renderAnnotationLayer={false}
          />
        </Document>

        {/* 2. Signature Layer (Foreground) */}
        {/* 'bounds="parent"' ka matlab signature box ke bahar nahi jayega */}
        <Draggable bounds="parent" nodeRef={nodeRef}>
          <div 
            ref={nodeRef}
            className="absolute top-12 left-12 cursor-move z-50 border-2 border-dashed border-blue-500 p-1 bg-white/30"
          >
            <span className="font-bold text-blue-500">My Signature</span>
            {/* Aap yahan <img /> bhi laga sakte hain */}
          </div>
        </Draggable>

      </div>

      <p className="mt-4 text-gray-700">Page 1 of {numPages}</p>
    </div>
    </>
  );
}