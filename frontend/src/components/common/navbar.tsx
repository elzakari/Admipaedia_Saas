import React, { useState } from 'react';
import { Bell, Search, Menu, X, User, Settings, LogOut, Moon, Sun } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from './button';
import { Input } from './input';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from './dropdown-menu';
import { Badge } from './badge';

interface NavbarProps {
  // Add any props if needed
}

export const Navbar: React.FC<NavbarProps> = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    // In a real app, you would implement actual dark mode toggling here
  };

  return (
    <nav className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 py-2.5 sticky top-0 z-10">
      <div className="flex flex-wrap justify-between items-center">
        {/* Left side - Mobile menu button and search */}
        <div className="flex items-center">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 mr-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          
          <div className="relative hidden md:block">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </div>
            <Input
              type="search"
              className="pl-10 w-64 bg-gray-50 dark:bg-slate-700"
              placeholder="Search..."
            />
          </div>
        </div>

        {/* Center - Logo (visible on mobile) */}
        <div className="flex items-center md:hidden">
          <Link to="/" className="flex items-center">
            <span className="self-center text-xl font-semibold whitespace-nowrap text-indigo-600 dark:text-indigo-400">
              ADMIPAEDIA
            </span>
          </Link>
        </div>

        {/* Right side - Notifications and Profile */}
        <div className="flex items-center">
          {/* Theme toggle */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleDarkMode} 
            className="mr-2"
          >
            {isDarkMode ? (
              <Sun className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            ) : (
              <Moon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            )}
          </Button>
          
          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative mr-2">
                <Bell className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                <Badge className="absolute -top-1 -right-1 px-1.5 py-0.5 text-xs">3</Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {/* Notification items */}
              <div className="max-h-80 overflow-y-auto">
                {[1, 2, 3].map((item) => (
                  <DropdownMenuItem key={item} className="cursor-pointer p-4">
                    <div className="flex items-start">
                      <Avatar className="h-9 w-9 mr-3">
                        <AvatarImage src={`https://randomuser.me/api/portraits/men/${item}.jpg`} />
                        <AvatarFallback>U{item}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">New message from User {item}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {item * 10} minutes ago
                        </p>
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer justify-center">
                <Link to="/notifications" className="text-indigo-600 dark:text-indigo-400 text-sm">
                  View all notifications
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Avatar>
                  <AvatarImage src="https://randomuser.me/api/portraits/men/1.jpg" />
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden mt-3">
          <div className="relative mb-3">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </div>
            <Input
              type="search"
              className="pl-10 w-full bg-gray-50 dark:bg-slate-700"
              placeholder="Search..."
            />
          </div>
          <ul className="flex flex-col space-y-2">
            <li>
              <Link 
                to="/dashboard" 
                className="block py-2 px-3 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700"
              >
                Dashboard
              </Link>
            </li>
            <li>
              <Link 
                to="/schedule" 
                className="block py-2 px-3 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700"
              >
                Schedule
              </Link>
            </li>
            <li>
              <Link 
                to="/students" 
                className="block py-2 px-3 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700"
              >
                Students
              </Link>
            </li>
            <li>
              <Link 
                to="/teachers" 
                className="block py-2 px-3 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700"
              >
                Teachers
              </Link>
            </li>
          </ul>
        </div>
      )}
    </nav>
  );
};

export default Navbar;