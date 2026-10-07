import ProfileSetupForm from './ProfileSetupForm';

export default function ProfileSetupModal({ isOpen, onSuccess }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
    >
      <div className="bg-[#FAF8F5] border border-[#E5E1D8] p-6 sm:p-8 rounded-xs max-w-xl w-full my-8 shadow-2xl">
        <div className="mb-6">
          <span className="font-code text-xs text-[#85837C] uppercase tracking-wider block mb-1">
            03 / Profile Setup Required
          </span>
          <h2
            id="profile-modal-title"
            className="font-editorial text-2xl sm:text-3xl text-[#181715] font-normal"
          >
            Complete Your Profile
          </h2>
          <p className="font-ui text-sm text-[#57554F] mt-1">
            Before accessing your dashboard, please provide your body metrics and lifestyle preferences.
          </p>
        </div>

        <ProfileSetupForm onSuccess={onSuccess} />
      </div>
    </div>
  );
}
