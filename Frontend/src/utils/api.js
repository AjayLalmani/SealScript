import axios from "axios";
import toast from 'react-hot-toast';

const api = axios.create({
    baseURL : "http://localhost:5000/api",
});

api.interceptors.request.use((config)=>{
    const token = localStorage.getItem('token');
    if(token){
        if (token.startsWith('"') && token.endsWith('"')) {
            token = token.slice(1, -1);
        }
        config.headers['x-auth-token'] = token;
    }
    return config
}, (error)=> Promise.reject(error));

api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response && error.response.status === 401) {
            // Check if the current path isn't already the login page
            if (window.location.pathname !== '/' && window.location.pathname !== '/signup') {
                localStorage.removeItem('token');
                toast.error('Session expired. Please log in again.', { id: 'session-expired' });
                window.location.href = '/';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
