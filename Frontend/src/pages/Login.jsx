import { useState } from "react";
import toast, { Toaster } from 'react-hot-toast';
import { useNavigate, Link } from "react-router-dom"; // Link added for Signup (Optional)
import api from "../utils/api";
import { ClipLoader } from 'react-spinners'; // Loader import

export default function Login() {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false); // Loading state added
  const navigate = useNavigate();

  const handleSubmit = async (evt) => {
    evt.preventDefault();
    setLoading(true); // Start Loader

    try {
      const response = await api.post("/auth/login", { email, password });
      console.log(response);

      if (response.data) {
        const token = response.data.token;
        if (token) {
          localStorage.setItem("token", token);
          toast.success("Login Successful!"); // Immediate feedback
          navigate("/dashboard");
        } else {
          toast.error("Login failed: No token received");
        }
      }
    } catch (err) {
      console.error(err);
      // Safe error handling (agar server down ho to crash nahi karega)
      const mess = err.response?.data?.message || "Something went wrong!";
      toast.error(mess, {
        id: 'login-failed'
      });
    } finally {
      setLoading(false); // Stop Loader
    }
  }

  return (
    // Background updated to Slate-50 (Professional Grey)
    <div className="flex justify-center items-center h-screen bg-slate-50 px-4">
      
      {/* Card: White with soft shadow */}
      <div className="w-full max-w-sm p-8 bg-white shadow-xl shadow-slate-200/60 rounded-2xl border border-white">
        
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Welcome Back</h1>
          <p className="text-slate-500 text-sm">Sign in to manage your documents</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Email Field */}
          <div>
            <label
              htmlFor="email"
              className="block text-slate-700 text-sm font-semibold mb-2"
            >
              Email Address
            </label>
            <input
              className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 placeholder-slate-400"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(evt) => setEmail(evt.target.value)}
              name="email"
              id="email"
              autoComplete="email"
              required
            />
          </div>

          {/* Password Field */}
          <div>
            <label
              htmlFor="password"
              className="block text-slate-700 text-sm font-semibold mb-2"
            >
              Password
            </label>
            <input
              className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 placeholder-slate-400"
              type="password"
              placeholder="••••••••"
              name="password"
              value={password}
              onChange={(evt) => setPassword(evt.target.value)}
              id="password"
              autoComplete="current-password"
              required
            />
          </div>

          {/* Submit Button (Indigo Gradient) */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-xl font-bold shadow-lg transition-all duration-200 flex justify-center items-center gap-2 text-white
              ${loading 
                ? "bg-indigo-400 cursor-not-allowed opacity-80" 
                : "bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 hover:shadow-indigo-500/30 active:scale-95"
              }`}
          >
            {loading ? (
              <>
                <ClipLoader size={20} color="#ffffff" />
                <span>Signing in...</span>
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* Optional: Simple Footer Link */}
        <div className="mt-6 text-center text-sm text-slate-500">
          Don't have an account?{" "}
          <Link to="/signup" className="text-indigo-600 font-semibold hover:underline">
            Create one
          </Link>
        </div>

      </div>
    </div>
  );
}