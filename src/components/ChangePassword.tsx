import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheck, Lock, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

export default function ChangePassword() {
  const { updatePassword, logout, profile } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isForced = profile?.needsPasswordChange;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await updatePassword(newPassword);
      setSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={cn(
      "flex items-center justify-center p-4",
      isForced ? "min-h-screen bg-neutral-50" : "h-full"
    )}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl shadow-neutral-200 border border-neutral-100 overflow-hidden",
          !isForced && "shadow-none border-none"
        )}
      >
        <div className={cn("p-8", isForced ? "sm:p-12" : "sm:p-6")}>
          {isForced && (
            <div className="w-16 h-16 bg-neutral-900 rounded-2xl flex items-center justify-center text-white mb-8 shadow-xl shadow-neutral-200">
              <ShieldCheck size={32} />
            </div>
          )}

          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 mb-2">
            {isForced ? 'Update Password' : 'Change Password'}
          </h1>
          <p className="text-neutral-500 mb-8">
            {isForced 
              ? 'Your administrator requires you to change your password before continuing.'
              : 'Update your account password to keep your account secure.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm font-bold rounded-2xl flex items-center gap-3">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            {success && (
              <div className="p-4 bg-green-50 border border-green-100 text-green-600 text-sm font-bold rounded-2xl flex items-center gap-3">
                <ShieldCheck size={18} />
                Password updated successfully!
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-neutral-500 ml-1">New Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                <input
                  type="password"
                  required
                  className="w-full pl-12 pr-4 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-neutral-500 ml-1">Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                <input
                  type="password"
                  required
                  className="w-full pl-12 pr-4 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-neutral-900 text-white rounded-2xl font-bold hover:bg-neutral-800 transition-all shadow-xl shadow-neutral-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : 'Update Password'}
            </button>

            {isForced && (
              <button
                type="button"
                onClick={logout}
                className="w-full py-4 text-neutral-500 font-bold hover:text-neutral-900 transition-all"
              >
                Sign Out
              </button>
            )}
          </form>
        </div>
      </motion.div>
    </div>
  );
}
