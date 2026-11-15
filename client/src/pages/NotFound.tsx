import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CustomButton } from '../components';

const NotFound = () => {
    const navigate = useNavigate();

    return (
        <div className="cozy-shell flex min-h-[60vh] w-full items-center justify-center">
            <div className="cozy-card relative flex max-w-[600px] flex-col items-center overflow-hidden px-8 py-12 text-center"><div className="cozy-blob" />
                {/* 404 Illustration */}
                <div className="mb-8">
                    <h1 className="relative z-10 font-display text-[110px] font-bold leading-none" style={{ color: 'var(--primary)' }}>
                        404
                    </h1>
                </div>

                {/* Error Message */}
                <h2 className="relative z-10 mb-4 font-display text-[32px] font-bold">
                    Page Not Found
                </h2>

                <p className="relative z-10 mb-8 text-[17px] leading-7" style={{ color: 'color-mix(in srgb, var(--ink) 68%, transparent)' }}>
                    Oops! The page you're looking for doesn't exist. It might have been moved or deleted.
                </p>

                {/* Action Buttons */}
                <div className="flex gap-4 flex-wrap justify-center">
                    <CustomButton
                        btnType="button"
                        title="Go to Home"
                        styles="bg-[#8c6dfd] hover:bg-[#7c5ded]"
                        handleClick={() => navigate('/')}
                    />
                    <CustomButton
                        btnType="button"
                        title="Create Campaign"
                        styles="bg-[#1c1c24] hover:bg-[#2c2f32]"
                        handleClick={() => navigate('/create-campaign')}
                    />
                </div>

                {/* Helpful Links */}
                <div className="mt-12 w-full">
                    <p className="font-epilogue font-semibold text-[16px] text-white text-center mb-4">
                        You might be looking for:
                    </p>
                    <div className="flex flex-wrap gap-3 justify-center">
                        <button
                            onClick={() => navigate('/')}
                            className="px-4 py-2 bg-[#1c1c24] text-[#4acd8d] rounded-[10px] font-epilogue font-medium text-[14px] hover:bg-[#2c2f32] transition-all"
                        >
                            Browse Campaigns
                        </button>
                        <button
                            onClick={() => navigate('/profile')}
                            className="px-4 py-2 bg-[#1c1c24] text-[#4acd8d] rounded-[10px] font-epilogue font-medium text-[14px] hover:bg-[#2c2f32] transition-all"
                        >
                            My Profile
                        </button>
                        <button
                            onClick={() => navigate('/about')}
                            className="px-4 py-2 bg-[#1c1c24] text-[#4acd8d] rounded-[10px] font-epilogue font-medium text-[14px] hover:bg-[#2c2f32] transition-all"
                        >
                            About Us
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotFound;
