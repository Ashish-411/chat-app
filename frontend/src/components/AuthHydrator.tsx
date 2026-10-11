'use client';

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { connectSocket } from "@/lib/socket";
import api from '@/lib/api';
import { ro } from "date-fns/locale";

const AUTH_PATHS = ['/login','/signup'];

export function AuthHydrator({children}: {children: React.ReactNode}){
    const {user, setAuth, logout} = useAuthStore();
    const router = useRouter();
    const pathname = usePathname();
    const [isHydrated, setIsHydrated] = useState(false);

    const isAuthPage = AUTH_PATHS.some(
        (path) => pathname === path || pathname.startsWith(`${path}/`)
      );
    useEffect(() =>{
        if (isAuthPage) {
          // If already logged in, send them straight to chat
          if (user) {
            router.replace('/chat');
            return;
          }
          setIsHydrated(true);
          return;
        }
        const hydrate = async() =>{
            try{
                const refreshRes = await api.post('/auth/refresh');
                setAuth(refreshRes.data.user, refreshRes.data.accessToken);
                connectSocket();
            }catch{
                logout();
                if(!pathname.startsWith('/login') && !pathname.startsWith('/signup')){
                    router.push('/login')
                }
            }finally{
                setIsHydrated(true);
            }
        };

        hydrate();
    },[isAuthPage]);

    if (!isHydrated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
      </div>
    );
  }
  return <>{children}</>
}