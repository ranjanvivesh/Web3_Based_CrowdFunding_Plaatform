import React from "react";
import { useNavigate } from "react-router-dom";
import { loader } from "../assets";
import FundCard from "./FundCard";
import { useStateContext } from "../context";

interface CustomDisplayCampaignsProps {
  title: string;
  isLoading: boolean;
  campaigns: any;
}

const DisplayCampaigns: React.FC<CustomDisplayCampaignsProps> = ({
  title,
  isLoading,
  campaigns,
}) => {
  const navigate = useNavigate();
  const context = useStateContext();
  const isDarkMode = context?.isDarkMode ?? true;

  const handleNavigate = (campaign: any) => {
    navigate(`/campaign-details/${campaign.title}`, { state: campaign });
  };

  return (
    <div>
      <h1
        className="font-display text-[32px] font-bold"
      >
        {title}({campaigns.length})
      </h1>
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {isLoading && (
          <img
            src={loader}
            alt="loader"
            className="w-[100px] h-[100px] object-contain"
          />
        )}

        {!isLoading && campaigns.length === 0 && (
          <p className="col-span-full text-[16px] leading-7" style={{ color: 'color-mix(in srgb, var(--ink) 68%, transparent)' }}>
            No campaigns yet. There is room here for the next good idea.
          </p>
        )}

        {!isLoading &&
          campaigns.length > 0 &&
          campaigns.map((campaign: any, index: number) => (

            <FundCard
              key={campaign.pId !== undefined ? campaign.pId : index}
              {...campaign}
              handleClick={() => handleNavigate(campaign)}
              animationDelay={index * 40}
            />

          ))}
      </div>
    </div>
  );
};

export default DisplayCampaigns;
