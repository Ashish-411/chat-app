'use client';

import {useState} from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { connectSocket } from '@/lib/socket';
import api from '@/lib/api';


export default function LoginPage(){
    const [email, setEmail] = useState("");
    const [password,setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const {setAuth} = useAuthStore();

    const handleSubmit = async(e: React.FormEvent) =>{
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try{
            const response = await api.post("/auth/login", {email,password});
            const {user, accessToken} = response.data;

            setAuth(user,accessToken);
            connectSocket();
            router.push('/chat');
        }catch(err:any){
            setError(err.response?.data?.message || "Login failed. Please check your credentials");
        }finally{
            setIsLoading(false);
        }
    };

    return(
        <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Welcome back</h1>
        <p className="mt-2 text-sm text-gray-500">Sign in to continue chatting</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500">
        Don&apos;t have an account?{' '}
        <a href="/signup" className="font-medium text-emerald-600 hover:text-emerald-700">
          Sign up
        </a>
      </p>
    </div>
    );


}