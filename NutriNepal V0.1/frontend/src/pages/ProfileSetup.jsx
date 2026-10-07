import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ProfileSetupForm from '../components/ProfileSetupForm';

function ProfileSetup() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#181715] flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center py-12 px-6">
        <div className="max-w-2xl w-full bg-[#FAF8F5] border border-[#E5E1D8] p-8 rounded-xs">
          <div className="mb-6">
            <span className="font-code text-xs text-[#85837C] uppercase tracking-wider block mb-1">
              03 / Profile Setup
            </span>
            <h1 className="font-editorial text-3xl text-[#181715] font-normal">
              Personalize Your Profile
            </h1>
            <p className="font-ui text-sm text-[#57554F] mt-1">
              Provide your body metrics and lifestyle preferences for tailored nutritional recommendations.
            </p>
          </div>

          <ProfileSetupForm onSuccess={() => navigate('/dashboard')} />
        </div>
      </main>
    </div>
  );
}

export default ProfileSetup;
