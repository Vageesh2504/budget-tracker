import React, { useState, useEffect } from 'react';
import { User, Mail, LogOut, Edit2, Check, X, Phone, Trash2, Key } from 'lucide-react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { del } from 'motion/react-client';

interface ProfileProps {
  userId: number;
  onLogout: () => void;
}

interface UserData {
  username: string;
  email?: string;
  phone?: string;
  created_at?: string;
  expenses_count?: number;
  total_spent?: number;
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Profile: React.FC<ProfileProps> = ({ userId, onLogout }) => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ username: '', email: '', phone: '' });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const res = await fetch('/api/user/profile', {
        headers: { 'x-user-id': String(userId) }
      });
      const data = await res.json();
      setUserData(data);
      setEditData({ username: data.username, email: data.email || '', phone: data.phone || '' });
      setLoading(false);
    } catch (err) {
      console.error('Error fetching user data:', err);
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setError(null);
      setSuccess(null);
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(userId)
        },
        body: JSON.stringify(editData)
      });
      const data = await res.json();
      if (data.success) {
        setUserData({ ...userData!, ...editData });
        setIsEditing(false);
        setSuccess('Profile updated successfully!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.message || 'Failed to update profile');
      }
    } catch (err) {
      setError('Error updating profile');
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }
    try {
      setError(null);
      const res = await fetch('/api/user/profile', {
        method: 'DELETE',
        headers: {
          'x-user-id': String(userId)
        }
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Account deleted successfully. Redirecting to login...');
        setTimeout(() => {
          setSuccess(null);
          onLogout();
        }, 3000);
        onLogout();

      } 
    } catch (err) {
      setSuccess(' delete account');
      setTimeout(() => {
          setSuccess(null);
          onLogout();
        }, 3000);
        onLogout();
    }
  };

  const handleChangePassword = async () => {
    setPwdError(null);
    setPwdSuccess(null);
    if (newPassword !== confirmPassword) {
      setPwdError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setPwdError('Password must be at least 6 characters');
      return;
    }
    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(userId)
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (data.success) {
        setPwdSuccess('Password changed successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setPwdSuccess(null);
          setChangePasswordVisible(false);
        }, 2000);
      } else {
        setPwdError(data.message || 'Failed to change password');
      }
    } catch (err) {
      setPwdSuccess(' password changed successfully');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      {/* Success Message */}
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700"
        >
          {success}
        </motion.div>
      )}

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700"
        >
          {error}
        </motion.div>
      )}

      {/* Profile Card */}
      <div className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">Profile Information</h2>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={cn(
              "p-3 rounded-xl transition-colors",
              isEditing
                ? "bg-red-50 text-red-600 hover:bg-red-100"
                : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
            )}
          >
            {isEditing ? <X size={20} /> : <Edit2 size={20} />}
          </button>
        </div>

        <div className="space-y-6">
          {/* Username Field */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2 flex items-center gap-2">
              <User size={16} />
              Username
            </label>
            {isEditing ? (
              <input
                type="text"
                value={editData.username}
                onChange={(e) => setEditData({ ...editData, username: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            ) : (
              <div className="px-4 py-3 bg-slate-50 rounded-xl text-slate-900 font-medium">
                {userData?.username}
              </div>
            )}
          </div>

          {/* Email Field */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2 flex items-center gap-2">
              <Mail size={16} />
              Email
            </label>
            {isEditing ? (
              <input
                type="email"
                value={editData.email}
                onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            ) : (
              <div className="px-4 py-3 bg-slate-50 rounded-xl text-slate-900 font-medium">
                {userData?.email || 'Not set'}
              </div>
            )}
          </div>

           {/* Phone Field */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2 flex items-center gap-2">
              <Phone size={16} />
              Phone Number
            </label>
            {isEditing ? (
              <input
                type="tel"
                value={editData.phone}
                onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            ) : (
              <div className="px-4 py-3 bg-slate-50 rounded-xl text-slate-900 font-medium">
                {userData?.phone || 'Not set'}
              </div>
            )}
          </div>

          

          {/* Edit Actions */}
          {isEditing && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3 pt-4"
            >
              <button
                onClick={handleSaveProfile}
                className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <Check size={18} />
                Save Changes
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 px-4 py-3 bg-slate-200 text-slate-900 rounded-xl hover:bg-slate-300 transition-colors font-medium"
              >
                Cancel
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Statistics Card */}
      {userData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm">
            <p className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-2">
              Total Expenses
            </p>
            <h3 className="text-3xl font-bold text-slate-900">
              {userData.expenses_count || 0}
            </h3>
          </div>
          <div className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm">
            <p className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-2">
              Total Spent
            </p>
            <h3 className="text-3xl font-bold text-emerald-600">
              ₹{(userData.total_spent || 0).toLocaleString('en-IN')}
            </h3>
          </div>
        </div>
      )}

      {/* Logout Button */}
      {/* Change Password Button */}
      <div className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm">
        <p className="text-slate-600 text-sm mb-4">
          Change your account password.
        </p>
        {pwdError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 mb-3">{pwdError}</div>
        )}
        {pwdSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 mb-3">{pwdSuccess}</div>
        )}
        <button
          onClick={() => setChangePasswordVisible(!changePasswordVisible)}
          className="w-full px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium flex items-center justify-center gap-2"
        >
          <Key size={18} />
          Change Password
        </button>

        {changePasswordVisible && (
          <div className="mt-4 space-y-3">
            <input
              type="password"
              placeholder="Current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none"
            />
            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none"
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none"
            />
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleChangePassword}
                className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium"
              >
                Save
              </button>
              <button
                onClick={() => setChangePasswordVisible(false)}
                className="flex-1 px-4 py-3 bg-slate-200 text-slate-900 rounded-xl hover:bg-slate-300 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-red-50 border border-red-200 rounded-[32px] p-8 shadow-sm">
        <p className="text-slate-600 text-sm mb-4">
          Sign out of your account. You'll need to login again to access your account.
        </p>
        <button
          onClick={onLogout}
          className="w-full px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-2"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>

      {/* Delete Account Button */}
      <div className="bg-red-50 border border-red-200 rounded-[32px] p-8 shadow-sm">
        <p className="text-slate-600 text-sm mb-4">
          Delete your account permanently. This action cannot be undone.
        </p>
        <button
          onClick={handleDeleteAccount}
          className="w-full px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-2"
        >
          <Trash2 size={18} />
          Delete Account
        </button>
      </div>
    </motion.div>
  );
};

export default Profile;
