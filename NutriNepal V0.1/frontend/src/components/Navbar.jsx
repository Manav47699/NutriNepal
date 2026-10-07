import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const displayName = user
    ? user.first_name
      ? `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`
      : user.username || user.email || 'User'
    : 'Account';

  return (
    <header className="sticky top-0 z-40 w-full bg-[#FAF8F5]/95 backdrop-blur-xs border-b border-[#E5E1D8] transition-colors">
      <div className="max-w-6xl mx-auto px-6 sm:px-8 h-18 flex items-center justify-between">
        <Link
          to="/"
          className="group flex items-baseline gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#244234] rounded-xs"
        >
          <span className="font-editorial text-2xl sm:text-2xl tracking-tight text-[#181715] font-medium group-hover:text-[#244234] transition-colors">
            NutriNepal
          </span>
          <span className="hidden sm:inline-block font-code text-[11px] uppercase tracking-wider text-[#85837C]">
            / Diet &amp; Fitness
          </span>
        </Link>

        <nav className="flex items-center gap-3 sm:gap-6" aria-label="Main Navigation">
          {isAuthenticated ? (
            <div className="flex items-center gap-3 sm:gap-4">
              <Link
                to="/dashboard"
                className="text-sm font-medium text-[#57554F] hover:text-[#181715] transition-colors px-2.5 py-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#244234] rounded-xs"
              >
                Dashboard
              </Link>
              <Link
                to="/profile"
                className="text-sm font-medium text-[#57554F] hover:text-[#181715] transition-colors px-2.5 py-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#244234] rounded-xs"
              >
                Profile
              </Link>
              <span className="hidden sm:inline-block font-ui text-sm font-medium text-[#85837C]">
                • {displayName}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="text-sm font-medium bg-[#181715] hover:bg-[#244234] text-[#FAF8F5] px-4 py-2 rounded-xs transition-all duration-150 shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#244234] cursor-pointer"
              >
                Logout
              </button>
            </div>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-medium text-[#57554F] hover:text-[#181715] transition-colors px-3 py-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#244234] rounded-xs"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="text-sm font-medium bg-[#181715] hover:bg-[#244234] text-[#FAF8F5] px-4 py-2 rounded-xs transition-all duration-150 shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#244234]"
              >
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
