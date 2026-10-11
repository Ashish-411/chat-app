import {create} from 'zustand';

export interface User{
    id: string;
    email: string | null;
    name: string | null;
    avatarUrl: string | null;
}

interface AuthState{
    user: User | null;
    accessToken : string | null;
    setAuth: (user: User, token :string) => void;
    setAccessToken: (token: string) => void;
    logout: ()=>void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,

  setAuth: (user, token) => set({ user, accessToken: token }),
  setAccessToken: (token) => set({ accessToken: token }),

  logout: () => {
    if (typeof window !== 'undefined') {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      }).catch(() => {});
    }
    set({ user: null, accessToken: null });
  },
}));