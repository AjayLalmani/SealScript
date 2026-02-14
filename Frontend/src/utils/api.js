import axios from "axios";

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

export default api;
