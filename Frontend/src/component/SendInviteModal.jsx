import { useState } from "react";
import toast from "react-hot-toast";
import api from "../utils/api";

export default function SendInviteModal({ fileId, fileName, onClose }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentLink, setSentLink] = useState(null);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      setLoading(true);
      const res = await api.post("/invite/send", { fileId, signerEmail: email });
      setSentLink(res.data.signingLink);
      toast.success(`Invitation sent to ${email}`);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to send invitation.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(sentLink);
    toast.success("Link copied to clipboard!");
  };

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-7"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-5">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Send for Signing</h2>
            <p className="text-sm text-slate-500 mt-0.5 truncate max-w-xs">{fileName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!sentLink ? (
          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Signer's Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="signer@example.com"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
              />
              <p className="text-xs text-slate-400 mt-1.5">
                The link expires in <strong>48 hours</strong> and can only be used once.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all duration-200 shadow-lg
                ${loading
                  ? "bg-indigo-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 active:scale-95"
                }`}
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Sending…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Send Signing Link
                </>
              )}
            </button>
          </form>
        ) : (
          // Success state — show copyable link
          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-semibold text-emerald-700">Email sent successfully!</p>
                <p className="text-xs text-emerald-600 mt-0.5">Invite sent to {email}</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1.5">SIGNING LINK</p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={sentLink}
                  className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-600 truncate"
                />
                <button
                  onClick={copyLink}
                  className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors whitespace-nowrap"
                >
                  Copy
                </button>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
