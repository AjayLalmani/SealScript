import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import Navbar from '../component/Navbar'


export default function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (location.state && location.state.message) {
      toast.success(location.state.message, {
        id: "login-success",
      });

      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  const pdfFiles = [
    
  ];

  return (
    <div className="min-h-screen bg-blue-50 font-sans">
      
      <Navbar/>

      {/* 2. MAIN CONTENT AREA (The Art Gallery Wall) */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Title and File Count */}
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800">My Documents</h2>
            <p className="text-sm text-gray-500 mt-1">Manage and view your uploaded PDFs here.</p>
          </div>
          <span className="text-sm font-medium bg-gray-200 text-gray-700 py-1 px-3 rounded-full">
            {pdfFiles.length} files
          </span>
        </div>
        
        {/* PDF Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {pdfFiles.map((file) => (
            // group class hover effects ke liye use hoti hai
            <div key={file.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg hover:border-blue-300 transition-all duration-300 cursor-pointer group flex flex-col">
              
              {/* PDF Icon & Title */}
              <div className="flex-1 flex flex-col items-center justify-center py-4">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:-translate-y-1 transition-transform duration-300">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                  </svg>
                </div>
                {/* truncate class lamba naam hone par '...' laga degi */}
                <h3 className="text-sm font-semibold text-gray-800 text-center truncate w-full px-2" title={file.name}>
                  {file.name}
                </h3>
              </div>

              <div className="h-px bg-gray-100 w-full my-3"></div>

              {/* Meta Info (Size and Date) */}
              <div className="flex justify-between items-center w-full text-xs text-gray-500">
                <span className="font-medium bg-gray-50 px-2 py-1 rounded border border-gray-100">{file.size}</span>
                <span>{file.date}</span>
              </div>

            </div>
          ))}
        </div>
        
        {/* Agar koi file nahi hai tab ye dikhega (Empty State) */}
        {pdfFiles.length === 0 && (
          <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center">
            <div className="text-gray-400 mb-4">
               <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            </div>
            <p className="text-gray-500 mb-4 text-lg">No Pdf Found !.</p>
            <Link to="/upload" className="text-amber-600 font-semibold hover:text-amber-800 hover:underline">
              Upload Pdf &rarr;
            </Link>
          </div>
        )}

      </main>

    </div>
  );

}
