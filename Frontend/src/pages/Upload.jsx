import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../utils/api";
import Navbar from "../component/Navbar";
import { ClipLoader } from 'react-spinners';

export default function Upload({ handleUrl }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      if (selectedFile.type !== "application/pdf") {
        toast.error("Only PDF format is supported", {
          id: "different-format",
        });
        return;
      }
      setFile(selectedFile);
      toast.success("File Selected Success", {
        id: "file-selected",
      });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!file) {
      toast.error("Please select PDF file", {
        id: "not-selected-pdf",
      });
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("myFile", file);
    try {
      const response = await api.post("/docs/upload", formData);
      console.log(response);
      if (response.data.success) {
        toast.success(response.data.success, {
          id: "File Uploaded",
        });
        setFile(null);
      }
      if (handleUrl) {
        handleUrl(response.data.path);
      }
      setLoading(false)
      navigate("/edit");
    } catch (error) {
      console.log("Backend Error : ", error);
      setLoading(false); 
      toast.error("Server Error", {
        id: "server error",
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Navbar />
      
      <div className="flex justify-center items-center py-20 px-4">
        <div className="bg-white w-full max-w-md p-8 shadow-xl shadow-slate-200/50 rounded-2xl border border-white">
          
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-800">Upload Document</h2>
            <p className="text-slate-500 text-sm mt-1">Select a PDF file to sign or edit.</p>
          </div>

          <form
            className="w-full space-y-6"
            encType="multipart/form-data"
            onSubmit={handleSubmit}
          >
          
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="file-upload"
                className={`flex flex-col items-center justify-center w-full h-52 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 group
                  ${file 
                    ? "border-emerald-400 bg-emerald-50" 
                    : "border-slate-300 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-400" 
                  }`}
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg
                    className={`w-12 h-12 mb-3 transition-colors duration-300 
                      ${file ? "text-emerald-500" : "text-slate-400 group-hover:text-indigo-500"}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    ></path>
                  </svg>

                  {/* Text Area */}
                  {file ? (
                    <div className="text-center">
                      <p className="mb-1 text-sm text-emerald-700 font-bold px-2">
                        {file.name}
                      </p>
                      <p className="text-xs text-emerald-600">Click to change file</p>
                    </div>
                  ) : (
                    <>
                      <p className="mb-2 text-sm text-slate-500">
                        <span className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">
                          Click to upload
                        </span>{" "}
                        or drag and drop
                      </p>
                      <p className="text-xs text-slate-400">PDF up to 10MB</p>
                    </>
                  )}
                </div>

                {/* Hidden File Input */}
                <input
                  id="file-upload"
                  type="file"
                  className="sr-only"
                  accept="application/pdf"
                  onChange={handleFileChange}
                />
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full text-white py-3.5 rounded-xl font-bold shadow-lg transition-all duration-200 flex justify-center items-center gap-2
                ${loading 
                  ? "bg-indigo-400 cursor-not-allowed opacity-80" 
                  : "bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 hover:shadow-indigo-500/30 active:scale-95"
                }`}
            >
              {loading ? (
                <>
                  <ClipLoader size={20} color="#ffffff" />
                  <span>Uploading...</span>
                </>
              ) : (
                "Continue to Editor"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}