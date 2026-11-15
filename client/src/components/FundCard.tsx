import React from "react";
import { tagType, thirdweb } from "../assets";
import { calculateBarPercentage, daysLeft } from "../utils";
import { useStateContext } from "../context";
import useDisplayName from "../utils/useDisplayName";
import { Link } from "react-router-dom";

interface CustomFundCardProps {
  owner: string;
  title: string;
  description: string;
  target: number;
  deadline: number;
  amountCollected: number;
  image: string;
  pId?: number;
  category?: string;
  backers?: number;
  animationDelay?: number;
  handleClick: () => void;

}

const FundCard: React.FC<CustomFundCardProps> = ({
  owner,
  title,
  description,
  target,
  deadline,
  amountCollected,
  image,
  pId,
  category = 'Uncategorized',
  backers = 0,
  animationDelay = 0,
  handleClick,

}): JSX.Element => {
  const context = useStateContext();
  const isDarkMode = context?.isDarkMode ?? true;
  const remainingDays = daysLeft(deadline);
  const percentage = Math.min(calculateBarPercentage(Number(target), Number(amountCollected)), 100);
  const address = context?.address;
  const { displayName } = useDisplayName(owner);
  const favoriteKey = address ? `crowdfunding:favorites:${address.toLowerCase()}` : '';
  const [isFavorite, setIsFavorite] = React.useState(() => favoriteKey && pId !== undefined ? JSON.parse(localStorage.getItem(favoriteKey) || '[]').includes(String(pId)) : false);
  const toggleFavorite = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!favoriteKey || pId === undefined) return;
    const favorites: string[] = JSON.parse(localStorage.getItem(favoriteKey) || '[]');
    const next = isFavorite ? favorites.filter((id) => id !== String(pId)) : [...new Set([...favorites, String(pId)])];
    localStorage.setItem(favoriteKey, JSON.stringify(next));
    setIsFavorite(!isFavorite);
  };

  return (
    <div style={{ animationDelay: `${animationDelay}ms` }} className="cozy-card cozy-hover cozy-rise w-full cursor-pointer overflow-hidden"
      onClick={handleClick}
    >
      <div className="relative p-2"><img src={image} alt="fund" className="h-[190px] w-full rounded-[17px] object-cover" /><button type="button" aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'} onClick={toggleFavorite} className="cozy-pill absolute right-5 top-5 h-9 w-9 text-[22px] leading-none" style={{ background: 'var(--card)', color: 'var(--primary)' }}>{isFavorite ? '★' : '☆'}</button></div>

      <div className="flex flex-col p-4">
        <div className="flex flex-row items-center mb-[18px]">
          <img
            src={tagType}
            alt="tag"
            className="w-[17px] h-[17px] object-contain"
          />
          <p className="cozy-pill ml-2 px-3 py-1 text-[12px] font-bold" style={{ background: 'color-mix(in srgb, var(--secondary) 17%, transparent)', color: 'var(--secondary)' }}>
            {category}
          </p>
        </div>

        <div className="block">
          <h3 className="font-display text-[20px] font-bold leading-7">
            {title}
          </h3>
          <p className="mt-2 line-clamp-2 text-[14px] leading-6" style={{ color: 'color-mix(in srgb, var(--ink) 68%, transparent)' }}>
            {description}
          </p>
        </div>

        <div className="mt-[18px]">
          <div className="ribbon"><div className="ribbon-fill" style={{ width: `${percentage}%` }} /><span className="ribbon-marker" style={{ left: `${Math.max(3, Math.min(97, percentage))}%` }} /></div>
          <div className="mt-3 flex justify-between text-[12px] font-bold"><span style={{ color: 'var(--primary)' }}>{percentage}% funded</span><span style={{ color: 'var(--secondary)' }}>{remainingDays} days left</span>
          </div>
        </div>

        <div className="flex justify-between flex-wrap mt-[15px] gap-2">
          <div className="flex flex-col">
            <h4 className={`font-epilogue font-semibold text-[14px] leading-[22px] ${
              isDarkMode ? 'text-[#b2b3bd]' : 'text-[#555]'
            }`}>
              <span className="tabular-nums">{amountCollected} ETH</span>
            </h4>
            <p className={`mt-[3px] font-epilogue font-normal text-[12px] leading-[18px] sm:max-w-[120px] truncate ${
              isDarkMode ? 'text-[#808191]' : 'text-[#888]'
            }`}>
              Raised of <span className="tabular-nums">{target} ETH</span>
            </p>
          </div>
          <div className="flex flex-col">
            <h4 className={`font-epilogue font-semibold text-[14px] leading-[22px] ${
              isDarkMode ? 'text-[#b2b3bd]' : 'text-[#555]'
            }`}>
              <span className="tabular-nums">{backers}</span>
            </h4>
            <p className={`mt-[3px] font-epilogue font-normal text-[12px] leading-[18px] sm:max-w-[120px] truncate ${
              isDarkMode ? 'text-[#808191]' : 'text-[#888]'
            }`}>
              Backers
            </p>
          </div>
        </div>

        <div className="flex items-center mt-[20px] gap-[12px]">
          <div className="w-[30px] h-[30px] rounded-full flex justify-center items-center bg-[#13131a]">
            <img
              src={thirdweb}
              alt="user"
              className="w-1/2 h-1/2 object-contain"
            />
          </div>
          <p className="flex-1 font-epilogue font-normal text-[12px] truncate" style={{ color: 'color-mix(in srgb, var(--ink) 55%, transparent)' }}>
            by <Link to={`/creator/${owner}`} onClick={(event) => event.stopPropagation()} className="font-bold" style={{ color: 'var(--primary)' }}>{displayName}</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default FundCard;
