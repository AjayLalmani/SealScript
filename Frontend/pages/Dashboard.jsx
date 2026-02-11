export default function Dashboard() {
  return (
    <div className="flex justify-center items-center h-screen bg-blue-50">
      <div className="bg-white w-96 p-8 shadow-xl rounded-2xl">
        <form className="max-w-md mx-auto w-full space-y-5">
          {/* Drag and Drop Container */}
          <div className="flex items-center justify-center w-full">
            <label
              htmlFor="file-upload"
              className="flex flex-col items-center justify-center w-full h-52 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-amber-50 hover:border-amber-400 transition-all duration-300 group"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {/* Upload Icon */}
                <svg
                  className="w-10 h-10 mb-3 text-gray-400 group-hover:text-amber-500 transition-colors duration-300"
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
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold text-amber-600">
                    Upload a file
                  </span>{" "}
                  or drag and drop
                </p>
                <p className="text-xs text-gray-400">
                  PNG, JPG, GIF up to 10MB
                </p>
              </div>

              {/* Hidden File Input */}
              <input id="file-upload" type="file" className="sr-only" />
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full text-white bg-amber-600 py-3 rounded-xl font-bold shadow-md hover:bg-amber-700 hover:shadow-lg active:scale-95 transition-all duration-200"
          >
            Submit File
          </button>
        </form>
      </div>
    </div>
  );
}
