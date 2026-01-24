import React from 'react';
import FacebookIcon from '../assets/icons/facebook.svg';
import GoogleIcon from '../assets/icons/google.svg';

interface SocialButtonProps {
  provider: 'google' | 'facebook';
  onClick: () => void;
  isLoading?: boolean;
}

const SocialButton: React.FC<SocialButtonProps> = ({ provider, onClick, isLoading = false }) => {
  const isGoogle = provider === 'google';
  const buttonText = isGoogle ? 'Continue with Google' : 'Continue with Facebook';
  
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      className={`flex items-center justify-center w-full py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all duration-200 ${
        isLoading ? 'opacity-70 cursor-not-allowed' : ''
      }`}
    >
      {isGoogle ? (
        <img src={GoogleIcon} alt="Google" className="h-5 w-5 mr-2" />
      ) : (
        <img src={FacebookIcon} alt="Facebook" className="h-5 w-5 mr-2" />
      )}
      {buttonText}
    </button>
  );
};

export default SocialButton;