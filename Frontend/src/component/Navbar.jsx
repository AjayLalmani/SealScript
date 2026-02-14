import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <>
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-2xl font-extrabold text-amber-600 tracking-tight">
              SealScript
            </h1>
          </div>

          <div className="flex items-center space-x-3 sm:space-x-5">
            <div className="hidden sm:block w-48 lg:w-64">
              <input
                type="text"
                placeholder="Search documents..."
                className="w-full px-4 py-2 bg-gray-100 border-transparent rounded-lg text-sm focus:bg-white focus:border-amber-600 focus:ring-2 focus:ring-amber-200 transition-all outline-none"
              />
            </div>
            <nav>
            <Link
              to="/upload"
              className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 transition shadow-sm flex items-center gap-2"
            >
              <span>Go to Upload</span>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                ></path>
              </svg>
            </Link>
            </nav>
            <div className="w-9 h-9 bg-amber-100 rounded-full flex items-center justify-center font-bold text-amber-700 border border-amber-200 cursor-pointer">
              AL
            </div>
          </div>
        </div>
      </header>
      ;
    </>
  );
}
