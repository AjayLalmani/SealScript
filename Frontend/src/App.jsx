import Dashboard from './pages/Dashboard';
import Login from './pages/Login'
import { BrowserRouter, Routes, Route } from "react-router";
import { Toaster } from 'react-hot-toast';
import Upload from "./pages/Upload"
import Edit from './pages/Edit';
import { useState } from 'react';

function App() {

  const [url, setUrl] = useState('');

  const handleUrl = (url)=>{
    setUrl(url);
  }
  
  return (
    <>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login/>}/>
        <Route path="/dashboard" element={<Dashboard handleUrl = {(url)=>handleUrl(url)}/>}/>
        <Route path='/upload' element={<Upload handleUrl = {(url)=>handleUrl(url)}/>}/>
        <Route path='/edit' element={<Edit path={url}/>}/>
      </Routes>
    </BrowserRouter>
    <Toaster />
    </>
  )
}

export default App
