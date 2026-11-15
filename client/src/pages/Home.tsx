import React,{useState,useEffect} from 'react'
import { useNavigate } from 'react-router-dom';
import { useStateContext } from '../context';
import DisplayCampaigns from '../components/DisplayCampaigns';


const Home = () => {
  const [isLoading,setIsLoading] = useState(false);
  const [campaigns,setCampaigns] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 12;
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('All');
  const categories = ['All', 'Technology', 'Art', 'Games', 'Film', 'Music', 'Community', 'Education', 'Health', 'Other', 'Uncategorized'];

  const context = useStateContext();
  if (!context) {
    return <div>Error: Context not found</div>;
  }
  const { address, contract, getCampaigns, isDarkMode } = context;

  const fetchCampaigns = async (nextPage = 0) => {
    setIsLoading(true);
    const pageData = await getCampaigns(nextPage * pageSize, pageSize);
    setCampaigns(nextPage === 0 ? pageData : (current) => [...current, ...pageData]);
    setPage(nextPage);
    setHasMore(pageData.length === pageSize);
    setIsLoading(false);
  }

  useEffect(()=>{
if(contract) fetchCampaigns();
  },[address,contract]);
  const visibleCampaigns = activeCategory === 'All'
    ? campaigns
    : campaigns.filter((campaign: any) => (campaign.category || 'Uncategorized') === activeCategory);
  return (
    <div className="space-y-10">
      <section className="cozy-card relative overflow-hidden px-7 py-12 sm:px-12 sm:py-16">
        <div className="cozy-blob" />
        <div className="relative z-10 max-w-[650px]"><p className="text-[13px] font-extrabold uppercase tracking-[2px]" style={{ color: 'var(--secondary)' }}>A little help for big ideas</p><h1 className="mt-4 font-display text-[48px] font-bold leading-[1.03] sm:text-[56px]">Fund the ideas your community wants to see.</h1><p className="mt-5 max-w-[560px] text-[16px] leading-7" style={{ color: 'color-mix(in srgb, var(--ink) 70%, transparent)' }}>Back thoughtful projects from real people, or gather the neighbors you need to make your own idea happen.</p><button type="button" onClick={() => navigate('/create-campaign')} className="cozy-pill mt-8 px-6 py-3 text-[14px] font-extrabold text-[var(--card)]" style={{ background: 'var(--primary)' }}>Start a campaign</button></div>
      </section>
      <div className="cozy-seam" />
      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(category)}
            className={`cozy-pill whitespace-nowrap border px-4 py-2 text-[13px] font-bold transition ${
              activeCategory === category
                ? 'border-[#1dc071] bg-[#1dc071] text-[#13131a]'
                : 'border-[var(--secondary)] text-[var(--secondary)] hover:bg-[color-mix(in_srgb,var(--secondary)_12%,transparent)]'
            }`}
          >
            {category}
          </button>
        ))}
      </div>
      <DisplayCampaigns
    title="All Campaigns"
    isLoading={isLoading}
    campaigns={visibleCampaigns}
    />
      {!isLoading && hasMore && <button type="button" onClick={() => fetchCampaigns(page + 1)} className="mt-8 rounded-[6px] border border-[#1dc071] px-5 py-3 font-epilogue text-[14px] font-bold text-[#1dc071]">Load more</button>}
    </div>

  )
}

export default Home