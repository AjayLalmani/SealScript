import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Navbar from '../component/Navbar';
import api from "../utils/api";
import { ClipLoader } from 'react-spinners';
import SendInviteModal from '../component/SendInviteModal';
import AuditModal from '../component/AuditModal';

const TABS = [
  { key: 'all',      label: 'All' },
  { key: 'unsigned', label: 'Unsigned' },
  { key: 'signed',   label: 'Signed' },
];

export default function Dashboard({ handleUrl, searchQuery = '', handleSearch }) {
  const navigate = useNavigate();
  const [pdfFiles, setPdfFiles]   = useState([]);
  const [loading,  setLoading]    = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [deletingId, setDeletingId] = useState(null);
  const [inviteTarget, setInviteTarget] = useState(null); // { fileId, fileName }
  const [auditTarget, setAuditTarget] = useState(null); // { fileId, fileName }

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

  // Apply search + tab filter (purely client-side)
  const displayedFiles = useMemo(() => {
    let list = pdfFiles;

    if (searchQuery && searchQuery.trim() !== '') {
      list = list.filter((f) =>
        f.fileName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (activeTab === 'signed')   list = list.filter((f) => f.isSigned);
    if (activeTab === 'unsigned') list = list.filter((f) => !f.isSigned);

    return list;
  }, [pdfFiles, searchQuery, activeTab]);

  // Counts shown in tab badges (based on full list, not search-filtered)
  const counts = useMemo(() => ({
    all:      pdfFiles.length,
    signed:   pdfFiles.filter((f) => f.isSigned).length,
    unsigned: pdfFiles.filter((f) => !f.isSigned).length,
  }), [pdfFiles]);

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });

  const handleViewPdf = (file) => {
    // Open signed PDF if available, else original
    const url = file.isSigned ? file.signedPdfUrl : file.fileUrl;
    if (handleUrl) handleUrl(url, file._id);
    navigate('/edit');
  };

  const handleDelete = async (e, fileId) => {
    e.stopPropagation(); // don't open the PDF
    if (!window.confirm('Are you sure you want to permanently delete this file?')) return;
    try {
      setDeletingId(fileId);
      await api.delete(`/docs/${fileId}`);
      setPdfFiles((prev) => prev.filter((f) => f._id !== fileId));
      toast.success('File deleted successfully.');
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to delete file.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Navbar searchQuery={searchQuery} handleSearch={handleSearch} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Documents</h2>
            <p className="text-sm text-slate-500 mt-1">Manage and sign your files securely.</p>
          </div>
          {!loading && (
            <span className="text-sm font-medium bg-white text-slate-600 py-1.5 px-4 rounded-full border border-slate-200 shadow-sm">
              {displayedFiles.length}{' '}
              {searchQuery
                ? 'Result(s)'
                : activeTab === 'all'
                  ? 'Total Files'
                  : activeTab === 'signed'
                    ? 'Signed'
                    : 'Unsigned'}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 mb-8 w-fit shadow-sm">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === tab.key
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              {tab.label}
              {!loading && (
                <span className={`text-xs rounded-full px-1.5 py-0.5 font-bold transition-all duration-200 ${
                  activeTab === tab.key
                    ? 'bg-indigo-500 text-white'
                    : tab.key === 'signed'
                      ? 'bg-emerald-100 text-emerald-700'
                      : tab.key === 'unsigned'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-500'
                }`}>
                  {counts[tab.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex flex-col justify-center items-center h-64">
            <ClipLoader color="#4f46e5" size={45} />
            <p className="text-slate-400 mt-4 text-sm font-medium animate-pulse">Fetching your documents...</p>
          </div>
        ) : (
          <>
            {displayedFiles.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {displayedFiles.map((file) => (
                  <div
                    key={file._id}
                    onClick={() => handleViewPdf(file)}
                    className={`relative bg-white p-5 rounded-2xl border shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer group flex flex-col ${
                      file.isSigned
                        ? 'border-emerald-200 hover:border-emerald-400'
                        : 'border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    {/* Delete Button — visible on card hover */}
                    <button
                      onClick={(e) => handleDelete(e, file._id)}
                      disabled={deletingId === file._id}
                      title="Delete file"
                      className="absolute top-3 left-3 z-10 p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all duration-200 disabled:opacity-50"
                    >
                      {deletingId === file._id ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                    {/* Status Badge */}
                    <div className="flex justify-end mb-1">
                      {file.isRejected ? (
                        <span className="flex items-center gap-1 text-xs font-semibold bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Rejected
                        </span>
                      ) : file.isSigned ? (
                        <span className="flex items-center gap-1 text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Signed
                        </span>
                      ) : (
                        <>
                          <span className="flex items-center gap-1 text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828A2 2 0 019 16H7v-2a2 2 0 01.586-1.414z" />
                            </svg>
                            Unsigned
                          </span>
                          {/* Send for Signing button */}
                          <button
                            onClick={(e) => { e.stopPropagation(); setInviteTarget({ fileId: file._id, fileName: file.fileName }); }}
                            title="Send for signing"
                            className="ml-1 p-1 rounded-lg text-amber-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </>
                      )}

                      {/* Audit Log button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); setAuditTarget({ fileId: file._id, fileName: file.fileName }); }}
                        title="View Audit Trail"
                        className="ml-1 p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      >
                        <svg className="w-4 h-4" autoFocus fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </button>
                    </div>

                    {/* Icon & Title */}
                    <div className="flex-1 flex flex-col items-center justify-center py-4">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-all duration-300 ${
                        file.isRejected 
                          ? 'bg-red-50 text-red-600 group-hover:bg-red-100'
                          : file.isSigned
                            ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100'
                            : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100'
                      }`}>
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <h3 className={`text-sm font-bold text-center truncate w-full px-2 transition-colors ${
                        file.isRejected 
                          ? 'text-slate-700 group-hover:text-red-500'
                          : file.isSigned
                            ? 'text-slate-700 group-hover:text-emerald-600'
                            : 'text-slate-700 group-hover:text-indigo-600'
                      }`}>
                        {file.fileName || "Untitled PDF"}
                      </h3>
                    </div>

                    <div className="h-px bg-slate-100 w-full my-3"></div>

                    {/* Meta Info */}
                    <div className="flex justify-between items-center w-full text-xs text-slate-400 font-medium">
                      <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded">PDF</span>
                      <span>
                        {file.isSigned && file.signedAt
                          ? `Signed ${formatDate(file.signedAt)}`
                          : file.createdAt
                            ? formatDate(file.createdAt)
                            : "N/A"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center">
                <div className="text-indigo-100 mb-4">
                  <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                </div>
                <h3 className="text-slate-800 text-lg font-semibold">
                  {searchQuery
                    ? `No results found for "${searchQuery}"`
                    : activeTab === 'signed'
                      ? 'No signed documents yet'
                      : activeTab === 'unsigned'
                        ? 'All documents are signed!'
                        : 'No documents found'}
                </h3>
                <p className="text-slate-500 mb-6">
                  {searchQuery
                    ? 'Try a different search term'
                    : activeTab === 'signed'
                      ? 'Sign a document to see it here.'
                      : activeTab === 'unsigned'
                        ? 'Great job! Upload more to get started.'
                        : 'Get started by creating a new document.'}
                </p>
                <Link to="/upload" className="text-indigo-600 font-semibold hover:text-indigo-800 hover:underline flex items-center gap-1">
                  Create New Document &rarr;
                </Link>
              </div>
            )}
          </>
        )}
      </main>

      {/* Send Invite Modal */}
      {inviteTarget && (
        <SendInviteModal
          fileId={inviteTarget.fileId}
          fileName={inviteTarget.fileName}
          onClose={() => setInviteTarget(null)}
        />
      )}

      {/* Audit Trail Modal */}
      {auditTarget && (
        <AuditModal
          fileId={auditTarget.fileId}
          fileName={auditTarget.fileName}
          onClose={() => setAuditTarget(null)}
        />
      )}
    </div>
  );
}