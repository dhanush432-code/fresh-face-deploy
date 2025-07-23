import React from 'react';
import { Menu, Bell, Sun, Moon, Search } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface NavbarProps {
  toggleSidebar: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ toggleSidebar }) => {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button 
            onClick={toggleSidebar}
            className="text-gray-600 focus:outline-none md:hidden"
          >
            <Menu size={24} />
          </button>
          <div className="relative mx-4 lg:mx-0">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <Search size={18} className="text-gray-500" />
            </span>
            <input
              className="w-32 sm:w-64 pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              type="text"
              placeholder="Search staff..."
            />
          </div>
        </div>

        <div className="flex items-center">
          <button 
            onClick={toggleTheme} 
            className="p-2 rounded-full text-gray-600 hover:bg-gray-100 focus:outline-none"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <div className="relative mx-2">
            <button className="p-2 rounded-full text-gray-600 hover:bg-gray-100 focus:outline-none">
              <Bell size={20} />
              <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500"></span>
            </button>
          </div>
          <div className="relative ml-3">
            <div className="flex items-center space-x-3">
              <div className="flex flex-col items-end">
                <span className="text-sm font-medium">Admin User</span>
                <span className="text-xs text-gray-500">Salon Manager</span>
              </div>
              <img
                className="h-8 w-8 rounded-full object-cover"
                src="https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg"
                alt="User"
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;