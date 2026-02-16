import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

export default function Navbar({ searchQuery = '', handleSearch }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState(searchQuery);

  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  // Helper to check active state
  const isActive = (path) => location.pathname === path;

  const handleSearchSubmit = (e) => {
    if (e.key === 'Enter' || e.type === 'click') {
      if (handleSearch) {
        handleSearch(searchInput);
      }
      if (location.pathname !== '/dashboard') {
        navigate('/dashboard');
      }
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchInput(value);
    if (handleSearch) {
      handleSearch(value);
    }
  };

  return (
    // Header wrapper
    <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* --- ROW 1: Logo & Actions --- */}
        <div className="h-16 flex items-center justify-between gap-2">
          {/* 1. BRAND LOGO */}
          <Link
            to="/dashboard"
            className="flex items-center gap-2 group cursor-pointer shrink-0"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-blue-500 rounded-lg flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-all duration-300">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <span className="text-xl font-bold text-slate-800 tracking-tight group-hover:text-indigo-600 transition-colors">
              Seal<span className="text-indigo-600">Script</span>
            </span>
          </Link>

          {/* 2. DESKTOP SEARCH (Hidden on Mobile) */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search documents..."
                value={searchInput}
                onChange={handleSearchChange}
                onKeyDown={handleSearchSubmit}
                className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl leading-5 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 sm:text-sm"
              />
            </div>
          </div>

          {/* 3. RIGHT SIDE ACTIONS */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Dashboard Link (Hidden on Mobile) */}
            <Link
              to="/dashboard"
              className={`hidden sm:flex items-center gap-2 text-sm font-medium transition-all duration-200 px-3 py-2 rounded-lg
                ${
                  isActive("/dashboard")
                    ? "text-indigo-700 bg-indigo-50"
                    : "text-slate-600 hover:text-indigo-600 hover:bg-slate-50"
                }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                />
              </svg>
              <span>Dashboard</span>
            </Link>

            {/* NEW DOCUMENT BUTTON (Responsive) */}
            <Link
              to="/upload"
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white p-2 sm:px-5 sm:py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5 active:scale-95"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              {/* Text hidden on mobile, visible on desktop */}
              <span className="hidden sm:inline">New Document</span>
            </Link>

            {/* User Avatar */}
            <div className="relative w-9 h-9 sm:w-10 sm:h-10 ml-1 cursor-pointer group flex-shrink-0">
              <div className="w-full h-full bg-indigo-50 rounded-full flex items-center justify-center border-2 border-white ring-2 ring-transparent group-hover:ring-indigo-200 transition-all shadow-sm">
                <span className="font-bold text-indigo-700 text-xs sm:text-sm">
                  AL
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* --- ROW 2: MOBILE SEARCH (Visible only on Mobile) --- */}
        <div className="md:hidden pb-4">
          <div className="relative w-full group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search documents..."
              value={searchInput}
              onChange={handleSearchChange}
              onKeyDown={handleSearchSubmit}
              className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl leading-5 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 text-sm shadow-sm"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
