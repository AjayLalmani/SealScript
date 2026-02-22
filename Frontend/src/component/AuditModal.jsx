import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ClipLoader } from 'react-spinners';
import api from '../utils/api';

export default function AuditModal({ fileId, fileName, onClose }) {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAuditTrail = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/audit/${fileId}`);
        if (response.data.success) {
          setAuditLogs(response.data.auditRecords || []);
        } else {
          toast.error(response.data.message || 'Failed to load audit logs.');
        }
      } catch (error) {
        console.error('Error fetching audit logs:', error);
        toast.error('Could not fetch the audit history for this document.');
      } finally {
        setLoading(false);
      }
    };

    if (fileId) {
      fetchAuditTrail();
    }
  }, [fileId]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Audit Trail
            </h2>
            <p className="text-sm text-gray-500 mt-1 truncate max-w-xl">
              {fileName || 'Document'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-gray-50/30">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 space-y-4">
              <ClipLoader color="#4f46e5" size={40} />
              <p className="text-sm font-medium text-gray-500 animate-pulse">Loading audit history...</p>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-800">No Signatures Yet</h3>
              <p className="text-gray-500 mt-2 max-w-sm">
                There are currently no recorded signatures physically embedded into this document.
              </p>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4">Date & Time</th>
                      <th className="px-6 py-4">Signer</th>
                      <th className="px-6 py-4">IP Address</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4 text-right">Page</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {auditLogs.map((log) => {
                      // Determine sign identity
                      let identity = "Guest";
                      let identitySub = "";
                      if (log.signedBy) {
                        identity = log.signedBy.name || "Registered User";
                        identitySub = log.signedBy.email || "";
                      } else if (log.signerEmail) {
                        identity = log.signerEmail;
                        identitySub = "Public Invite";
                      }
                      
                      return (
                        <tr key={log._id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">{formatDate(log.timestamp)}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                                {identity.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{identity}</div>
                                {identitySub && <div className="text-xs text-gray-500">{identitySub}</div>}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200">
                              {log.ipAddress}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              log.signatureType === 'drawn' 
                                ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                                : 'bg-purple-50 text-purple-700 border border-purple-200'
                            }`}>
                              {log.signatureType === 'drawn' ? '✍️ Drawn' : '🔤 Typed'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-medium text-gray-600">
                            {log.pageIndex + 1}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
