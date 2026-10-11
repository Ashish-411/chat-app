import {io, Socket} from 'socket.io-client';
import { useAuthStore } from '@/store/useAuthStore';

let socket: Socket | null = null;

export const connectSocket = () =>{
    const token = useAuthStore.getState().accessToken;

    if(!token) return null;

    if (socket?.connected) return socket;

    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL ||'http://localhost:4000',{
        auth:{token},
        withCredentials: true,
    } );
    socket.connect();
    return socket;   
};

export const disconnectSocket = () =>{
    if(socket){
        socket.disconnect();
        socket = null;
    }
};

export const getSocket = () => socket;