import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProfileSetupModal from './ProfileSetupModal';

export default function AuthenticatedGate({ children }) {
  const { isAuthenticated, isLoading, hasProfile } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <span className="font-code text-xs text-[#85837C] uppercase tracking-wider">
          Loading...
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (hasProfile === false) {
    return (
      <div className="relative min-h-screen">
        {children}
        <ProfileSetupModal isOpen={true} />
      </div>
    );
  }

  return children;
}
