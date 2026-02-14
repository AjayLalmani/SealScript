import { useState } from "react";
import toast, { Toaster } from 'react-hot-toast';

import {useNavigate} from "react-router-dom"
import api from "../utils/api";

export default function Login() {

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    const handleSubmit = async (evt)=>{
        evt.preventDefault();
        console.log(email)
        console.log(password);
        try{
            const response = await api.post("/auth/login", {email, password});
            console.log(response);
            if(response){
              const token = response.data.token; 
                if (token) {
                    localStorage.setItem("token", token);
                } else {
                    console.error("Token backend se nahi aaya!");
                }
               navigate("/dashboard", {state : {message : response.data.message}});
            }

        }catch(err){
            const mess = err.response.data.message;
            toast.error(mess, {
              id : 'login-failed'
            });
        }
    }
  return (
    <div className="flex justify-center items-center h-screen bg-blue-50 p-2">
      <div className="w-96 p-6 items-center bg-white shadow-xl rounded-2xl">
        <form onSubmit={handleSubmit}>
          <div>
            <h1 className="text-2xl text-gray-700 mb-4 font-bold text-center">Login</h1>
          </div>
          <label
            htmlFor="email"
            className="block text-gray-700 text-sm font-bold mb-1"
          >
            Email
          </label>
          <input
            className="border border-gray-300 rounded-lg p-2 w-full focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-transparent transition shadow-sm mb-3"
            type="email"
            placeholder="example@gmail.com"
            value={email}
            onChange={(evt)=>setEmail(evt.target.value)}
            name="email"
            id="email"
            autoComplete="email"
          />
          <label
            htmlFor="password"
            className="block text-gray-700 text-sm font-bold mb-1"
          >
            Password
          </label>
          <input
            className="border border-gray-300 rounded-lg p-2 w-full focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-transparent transition shadow-sm mb-3"
            type="password"
            placeholder="••••••••"
            name="password"
            value={password}
            onChange={(evt)=>setPassword(evt.target.value)}
            id="password"
            autoComplete="password"
          />
          <button
            className="w-full text-white bg-amber-600 p-2 rounded-xl mt-1 hover:bg-amber-700 font-bold shadow-md hover:shadow-xl active:scale-95 duration-200 transition"
            type="submit"
          >
            Submit
          </button>
        </form>
      </div>
    </div>
  );
}
