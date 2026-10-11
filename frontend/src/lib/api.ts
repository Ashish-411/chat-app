import axios from "axios";
import { useAuthStore } from "@/store/useAuthStore";

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
    withCredentials: true,
});

api.interceptors.request.use((config) =>{
    const token = useAuthStore.getState().accessToken;
    if(token){
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    async (error) =>{
        const originalRequest = error.config;

        if(error.response?.status === 401 && !originalRequest._retry){
            originalRequest._retry = true;

            try {
                const refreshResponse = await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
                {},
                { withCredentials: true }
                );

                const { accessToken, user } = refreshResponse.data;
                useAuthStore.getState().setAuth(user, accessToken);

                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                useAuthStore.getState().logout();
                if (typeof window !== 'undefined') {
                window.location.href = '/login';
                }
                return Promise.reject(refreshError);
            }
        }
    }
);
export default api;