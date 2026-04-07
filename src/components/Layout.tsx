import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, 
  Laptop, 
  Key, 
  Users, 
  LogOut, 
  Menu, 
  X,
  Package,
  ShieldCheck
} from 'lucide-react';
import { cn } from '../lib/utils';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Layout({ children, activeTab, setActiveTab }: LayoutProps) {
  const { profile, logout, isAdmin } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'assets', label: 'Assets', icon: Laptop },
    { id: 'licenses', label: 'Licenses', icon: Key, adminOnly: true },
    { id: 'users', label: 'Users', icon: Users, adminOnly: true },
    { id: 'security', label: 'Security', icon: ShieldCheck },
  ];

  const filteredMenuItems = menuItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <div className="flex h-screen bg-neutral-50 font-sans text-neutral-900">
      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-neutral-900 border-r border-neutral-800 transition-all duration-300 ease-in-out lg:relative",
          isSidebarOpen 
            ? "translate-x-0 lg:w-64 lg:opacity-100" 
            : "-translate-x-full lg:w-0 lg:opacity-0 lg:pointer-events-none"
        )}
      >
        <div className={cn(
          "flex flex-col h-full transition-opacity duration-300",
          !isSidebarOpen && "lg:opacity-0"
        )}>
          <div className="p-6 border-b border-neutral-800 flex items-center gap-3">
            <div className="w-10 h-10 bg-[#0047AB] rounded-xl flex items-center justify-center overflow-hidden shadow-lg shadow-white/5 border border-neutral-800">
              <img 
                src="/image.png" 
                alt="ICS Logo" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "https://media.licdn.com/dms/image/v2/D4D0BAQG_v_v_v_v_v/company-logo_200_200/company-logo_200_200/0/1630571000000?e=2147483647&v=beta&t=m6_v_v_v_v_v";
                  target.parentElement!.style.backgroundColor = 'white';
                  target.className = "w-full h-full object-contain p-1";
                }}
              />
            </div>
            <div className="whitespace-nowrap">
              <h1 className="text-lg font-bold tracking-tight text-white leading-tight">ICS IT Admin</h1>
              <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider">Directorate Inventory</p>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {filteredMenuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 whitespace-nowrap",
                  activeTab === item.id 
                    ? "bg-white text-neutral-900 shadow-xl shadow-white/10" 
                    : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
                )}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-neutral-800">
            <div className="flex items-center gap-3 p-3 bg-neutral-800/50 rounded-2xl mb-4 border border-neutral-800">
              <div className="w-10 h-10 rounded-full bg-neutral-700 overflow-hidden ring-2 ring-neutral-800 shrink-0">
                {profile?.photoURL ? (
                  <img src={profile.photoURL} alt="" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-white text-neutral-900 text-xs font-black">
                    {profile?.displayName?.charAt(0) || profile?.email?.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{profile?.displayName || 'User'}</p>
                <div className="flex items-center gap-1">
                  <ShieldCheck size={12} className="text-neutral-500" />
                  <p className="text-[10px] text-neutral-500 uppercase font-black tracking-wider">{profile?.role}</p>
                </div>
              </div>
            </div>
            <button 
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all active:scale-95 whitespace-nowrap"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-neutral-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-neutral-200 flex items-center justify-between px-6 lg:px-10">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <Menu size={20} />
          </button>
          
          <div className="flex-1 lg:flex-none">
            <h2 className="text-xl font-bold tracking-tight capitalize">{activeTab}</h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full border border-green-100">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider">System Live</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 lg:p-10">
          {children}
        </div>
      </main>
    </div>
  );
}
