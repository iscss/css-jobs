
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X, Search, Briefcase, Plus, User, Shield } from 'lucide-react';
import AuthButton from './AuthButton';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAdmin, useAdminApprovals } from '@/hooks/useAdminApprovals';
import { Badge } from '@/components/ui/badge';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const { data: pendingApprovals } = useAdminApprovals();

  const handleSearch = () => {
    navigate('/jobs');
  };

  const pendingCount = pendingApprovals?.length || 0;

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">CSS</span>
            </div>
            <div className="hidden sm:block">
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                CSS Jobs
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Button
              variant="ghost"
              onClick={handleSearch}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <Search className="w-4 h-4" />
              Browse Jobs
            </Button>
            
            {user && (
              <>
                <Link to="/post-job">
                  <Button variant="ghost" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                    <Plus className="w-4 h-4" />
                    Post Job
                  </Button>
                </Link>
                
                <Link to="/profile">
                  <Button variant="ghost" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                    <User className="w-4 h-4" />
                    Profile
                  </Button>
                </Link>

                {isAdmin && (
                  <Link to="/admin">
                    <Button variant="ghost" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 relative">
                      <Shield className="w-4 h-4" />
                      Admin
                      {pendingCount > 0 && (
                        <Badge 
                          variant="destructive" 
                          className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center"
                        >
                          {pendingCount}
                        </Badge>
                      )}
                    </Button>
                  </Link>
                )}
              </>
            )}
          </nav>

          {/* Auth Button */}
          <div className="hidden md:block">
            <AuthButton />
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <nav className="flex flex-col space-y-4">
              <Button
                variant="ghost"
                onClick={handleSearch}
                className="flex items-center gap-2 justify-start text-gray-600 hover:text-gray-900"
              >
                <Search className="w-4 h-4" />
                Browse Jobs
              </Button>
              
              {user && (
                <>
                  <Link to="/post-job">
                    <Button variant="ghost" className="flex items-center gap-2 justify-start w-full text-gray-600 hover:text-gray-900">
                      <Plus className="w-4 h-4" />
                      Post Job
                    </Button>
                  </Link>
                  
                  <Link to="/profile">
                    <Button variant="ghost" className="flex items-center gap-2 justify-start w-full text-gray-600 hover:text-gray-900">
                      <User className="w-4 h-4" />
                      Profile
                    </Button>
                  </Link>

                  {isAdmin && (
                    <Link to="/admin">
                      <Button variant="ghost" className="flex items-center gap-2 justify-start w-full text-gray-600 hover:text-gray-900 relative">
                        <Shield className="w-4 h-4" />
                        Admin
                        {pendingCount > 0 && (
                          <Badge 
                            variant="destructive" 
                            className="ml-2 h-5 w-5 p-0 text-xs flex items-center justify-center"
                          >
                            {pendingCount}
                          </Badge>
                        )}
                      </Button>
                    </Link>
                  )}
                </>
              )}
              
              <div className="pt-4 border-t border-gray-200">
                <AuthButton />
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
