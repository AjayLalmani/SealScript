import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Signup from './pages/Signup';
import { BrowserRouter, Routes, Route } from "react-router";
import { Toaster } from 'react-hot-toast';
import Upload from "./pages/Upload"
import Edit from './pages/Edit';
import PublicSign from './pages/PublicSign';
import ProtectedRoute from './component/ProtectedRoute';
import { useState } from 'react';

function App() {

  const [url, setUrl] = useState('');
  const [fileId, setFileId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Accept both the Cloudinary URL and the MongoDB _id of the File document
  const handleUrl = (pdfUrl, mongoId = '') => {
    setUrl(pdfUrl);
    setFileId(mongoId);
  }

  const handleSearch = (query) => {
    setSearchQuery(query);
  }
  
  return (
    <>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login/>}/>
        <Route path="/signup" element={<Signup/>}/>
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard handleUrl={handleUrl} searchQuery={searchQuery} handleSearch={handleSearch}/></ProtectedRoute>}/>
        <Route path='/upload' element={<ProtectedRoute><Upload handleUrl={handleUrl}/></ProtectedRoute>}/>
        <Route path='/edit' element={<ProtectedRoute><Edit path={url} fileId={fileId}/></ProtectedRoute>}/>
        <Route path='/sign/:token' element={<PublicSign />}/>
      </Routes>
    </BrowserRouter>
    <Toaster />
    </>
  )
}

export default App

