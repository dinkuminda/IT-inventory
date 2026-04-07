import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import AssetList from './components/AssetList';
import LicenseList from './components/LicenseList';
import UserList from './components/UserList';
import Login from './components/Login';
import ChangePassword from './components/ChangePassword';

function AppContent() {
  const { user, profile, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="w-12 h-12 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (profile?.needsPasswordChange) {
    return <ChangePassword />;
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'dashboard' && <Dashboard />}
      {activeTab === 'assets' && <AssetList />}
      {activeTab === 'licenses' && <LicenseList />}
      {activeTab === 'users' && <UserList />}
      {activeTab === 'security' && <ChangePassword />}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
