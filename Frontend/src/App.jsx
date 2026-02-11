import Dashboard from '../pages/Dashboard';
import Login from '../pages/Login'
import { BrowserRouter, Routes, Route } from "react-router";

function App() {
  
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login/>}/>
        <Route path="/dashboard" element={<Dashboard/>}/>
      </Routes>
    </BrowserRouter>
  )
}

export default App
