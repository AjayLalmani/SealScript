import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import Navbar from '../component/Navbar';
import api from "../utils/api";
import { ClipLoader } from 'react-spinners';

export default function Dashboard({ handleUrl }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [pdfFiles, setPdfFiles] = useState([]);
  const [loading, setLoading] = useState(true);


  // ... (Fetch Logic Same) ...
  useEffect(() => {
    const fetchDocs = async () => {
      try {
        setLoading(true);
        const response = await api.get('/docs');
        if (response.data.success) {
          setPdfFiles(response.data.files);
        }
      } catch (error) {
        console.error("Error fetching docs:", error);
        toast.error("Failed to load documents");
      } finally {
        setLoading(false);
      }
    };
    fetchDocs();
  }, []);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  const handleViewPdf = (url) => {
    if (handleUrl) handleUrl(url);
    navigate('/edit');
  }

  return (
    // Background updated to Professional Slate-50
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header Section */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Documents</h2>
            <p className="text-sm text-slate-500 mt-1">Manage and sign your files securely.</p>
          </div>
          {!loading && (
            <span className="text-sm font-medium bg-white text-slate-600 py-1.5 px-4 rounded-full border border-slate-200 shadow-sm">
              {pdfFiles.length} Total Files
            </span>
          )}
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col justify-center items-center h-64">
             {/* Loader Color: Indigo-600 (#4f46e5) */}
             <ClipLoader color="#4f46e5" size={45} />
             <p className="text-slate-400 mt-4 text-sm font-medium animate-pulse">Fetching your documents...</p>
          </div>
        ) : (
          <>
            {/* Grid */}
            {pdfFiles.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {pdfFiles.map((file) => (
                  <div 
                    key={file._id} 
                    onClick={() => handleViewPdf(file.fileUrl)} 
                    // Card: White with Indigo hover border
                    className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-300 transition-all duration-300 cursor-pointer group flex flex-col"
                  >
                    
                    {/* Icon & Title */}
                    <div className="flex-1 flex flex-col items-center justify-center py-6">
                      {/* Icon BG: Soft Indigo */}
                      <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-indigo-100 transition-all duration-300">
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                        </svg>
                      </div>
                      
                      <h3 className="text-sm font-bold text-slate-700 text-center truncate w-full px-2 group-hover:text-indigo-600 transition-colors">
                        {file.fileName || "Untitled PDF"}
                      </h3>
                    </div>

                    <div className="h-px bg-slate-100 w-full my-3"></div>

                    {/* Meta Info */}
                    <div className="flex justify-between items-center w-full text-xs text-slate-400 font-medium">
                      <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded">PDF</span> 
                      <span>{file.createdAt ? formatDate(file.createdAt) : "N/A"}</span>
                    </div>

                  </div>
                ))}
              </div>
            ) : (
              // Empty State
              <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center">
                <div className="text-indigo-100 mb-4">
                   <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                </div>
                <h3 className="text-slate-800 text-lg font-semibold">No documents found</h3>
                <p className="text-slate-500 mb-6">Get started by creating a new document.</p>
                
                <Link to="/upload" className="text-indigo-600 font-semibold hover:text-indigo-800 hover:underline flex items-center gap-1">
                  Create New Document &rarr;
                </Link>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}