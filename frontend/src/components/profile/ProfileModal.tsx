'use client';

import {useState} from 'react';
import { X, Check, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import AvatarUpload from '../AvatarUpload';
import api from '@/lib/api';


interface ProfileModalProps{
    isOpen: boolean;
    onClose: () => void;
}

export default function ProfileModal({isOpen, onClose}: ProfileModalProps){
    const {user, setAuth} = useAuthStore();
    const [name, setName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatarUrl || null);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    if(!isOpen) return null;

    const handleSave = async() =>{
        setIsSaving(true);
        setError('');
        setSuccess(false);

        try{
            const response = await api.patch('/users/me',{
                name: name.trim(),
                avatarUrl,
            });

            const accessToken = useAuthStore.getState().accessToken;
            if(accessToken){
                setAuth(response.data,accessToken);
            }
            setSuccess(true);
            setTimeout(() =>{
                setSuccess(false);
                onClose();
            },1500);
        }catch(err:any){
            setError(err.response?.data?.message || 'Failed to update profile');
        }finally{
            setIsSaving(false);
        }
    };

    const hasChanges = 
        name.trim() !== (user?.name || '') || avatarUrl !== user?.avatarUrl;

        return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Your Profile</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Avatar */}
        <div className="flex justify-center mb-6">
          <AvatarUpload value={avatarUrl} onChange={setAvatarUrl} size="lg" />
        </div>

        {/* Name */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Display Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={100}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        {/* Email (read-only) */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            value={user?.email || ''}
            disabled
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-500 cursor-not-allowed"
          />
          <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
        </div>

        {/* Error / Success */}
        {error && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 p-2 rounded-md">{error}</p>
        )}
        {success && (
          <p className="mb-4 text-sm text-green-600 bg-green-50 p-2 rounded-md flex items-center gap-1">
            <Check className="w-4 h-4" /> Profile updated!
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="flex-1 rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Save
          </button>
        </div>
      </div>
    </div>
    );

}