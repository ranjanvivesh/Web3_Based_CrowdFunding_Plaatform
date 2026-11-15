import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useStateContext } from "../context";
import { CustomButton, Loader, SuccessModal } from "../components";
import { calculateBarPercentage, daysLeft } from "../utils";
import { thirdweb } from "../assets";
import useDisplayName from "../utils/useDisplayName";
import { Link } from "react-router-dom";

interface Donator { donator: string; donation: string; }
interface CampaignMessage { author: string; text: string; timestamp: number; }
interface CampaignTier { name: string; minAmount: string; description: string; }
const AddressName = ({ address }: { address: string }) => { const { displayName } = useDisplayName(address); return <Link to={`/creator/${address}`} className="font-bold" style={{ color: 'var(--primary)' }}>{displayName}</Link>; };

const CampaignDetails = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const context = useStateContext();
  const theme = context || { isDarkMode: true, donate: undefined, getDonations: undefined, getUserCampaigns: undefined, getUpdates: undefined, getComments: undefined, postUpdate: undefined, postComment: undefined, getTiers: undefined, withdrawFunds: undefined, claimRefund: undefined, updateCampaignDetails: undefined, contract: undefined, address: undefined };
  const { donate, getDonations, getUserCampaigns, getUpdates, getComments, postUpdate, postComment, getTiers, withdrawFunds, claimRefund, updateCampaignDetails, contract, address, isDarkMode } = theme;
  const [isLoading, setIsLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [donators, setDonators] = useState<Donator[]>([]);
  const [creatorCampaigns, setCreatorCampaigns] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("Story");
  const [updates, setUpdates] = useState<CampaignMessage[]>([]);
  const [comments, setComments] = useState<CampaignMessage[]>([]);
  const [updateText, setUpdateText] = useState("");
  const [commentText, setCommentText] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [tiers, setTiers] = useState<CampaignTier[]>([]);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const [editImage, setEditImage] = useState('');
  const [shareMessage, setShareMessage] = useState('');

  const fetchDonators = async () => {
    if (!getDonations || state?.pId === undefined) return;
    try { setDonators(await getDonations(state.pId)); } catch { setDonators([]); }
  };

  useEffect(() => { if (contract && state?.pId !== undefined) fetchDonators(); }, [contract, address, state?.pId]);
  useEffect(() => {
    if (contract && getUserCampaigns && state?.owner) {
      getUserCampaigns().then((campaigns: any[]) => setCreatorCampaigns(campaigns.filter((campaign) => campaign.owner === state.owner))).catch(() => setCreatorCampaigns([]));
    }
  }, [contract, address, state?.owner]);
  useEffect(() => {
    if (!contract || state?.pId === undefined) return;
    if (activeTab === "Updates" && getUpdates) getUpdates(state.pId).then((items: CampaignMessage[]) => setUpdates([...items].reverse())).catch(() => setUpdates([]));
    if (activeTab === "Comments" && getComments) getComments(state.pId).then((items: CampaignMessage[]) => setComments([...items].reverse())).catch(() => setComments([]));
  }, [activeTab, contract, state?.pId]);
  useEffect(() => {
    if (contract && getTiers && state?.pId !== undefined) getTiers(state.pId).then(setTiers).catch(() => setTiers([]));
  }, [contract, state?.pId]);

  if (!state) return <p className="font-epilogue text-[#808191]">Campaign not found.</p>;
  const percentage = Math.min(calculateBarPercentage(Number(state.target), Number(state.amountCollected)), 100);
  const remainingDays = daysLeft(state.deadline);
  const isPastDeadline = Date.now() >= Number(state.deadline);
  const isSuccessful = isPastDeadline && Number(state.amountCollected) >= Number(state.target);
  const isFailed = isPastDeadline && Number(state.amountCollected) < Number(state.target);
  const canClaimRefund = Boolean(address && isFailed && donators.some((item) => item.donator.toLowerCase() === address.toLowerCase() && Number(item.donation) > 0));

  const handleDonate = async () => {
    if (!donate || !amount || parseFloat(amount) <= 0) { alert("Please enter a valid donation amount."); return; }
    setIsLoading(true);
    try { await donate(state.pId, amount); await fetchDonators(); setIsLoading(false); setShowSuccessModal(true); }
    catch { alert("Donation failed. Please check your wallet and try again."); setIsLoading(false); }
  };

  const handleWithdraw = async () => {
    if (!withdrawFunds) return;
    setIsLoading(true);
    try { await withdrawFunds(state.pId); alert("Funds withdrawn successfully."); }
    catch { alert("Could not withdraw funds."); }
    finally { setIsLoading(false); }
  };

  const handleRefund = async () => {
    if (!claimRefund) return;
    setIsLoading(true);
    try { await claimRefund(state.pId); await fetchDonators(); alert("Refund claimed successfully."); }
    catch { alert("Could not claim your refund."); }
    finally { setIsLoading(false); }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareMessage('Link copied');
      window.setTimeout(() => setShareMessage(''), 2200);
    } catch { setShareMessage('Unable to copy link'); }
  };

  const handleEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!updateCampaignDetails || !editDescription.trim() || !editImage.trim()) return;
    setIsLoading(true);
    try {
      await updateCampaignDetails(state.pId, editDescription.trim(), editImage.trim());
      state.description = editDescription.trim();
      state.image = editImage.trim();
      setShowEditForm(false);
    } catch { alert('Could not update campaign details.'); }
    finally { setIsLoading(false); }
  };

  const handlePostUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!postUpdate || !updateText.trim()) return;
    setIsPosting(true);
    try { await postUpdate(state.pId, updateText.trim()); setUpdateText(""); const items = await getUpdates(state.pId); setUpdates([...items].reverse()); }
    catch { alert("Could not post the update."); }
    finally { setIsPosting(false); }
  };

  const handlePostComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!address) { alert("Connect your wallet to post a comment."); return; }
    if (!postComment || !commentText.trim()) return;
    setIsPosting(true);
    try { await postComment(state.pId, commentText.trim()); setCommentText(""); const items = await getComments(state.pId); setComments([...items].reverse()); }
    catch { alert("Could not post the comment."); }
    finally { setIsPosting(false); }
  };

  const formatTimestamp = (timestamp: number) => new Date(timestamp * 1000).toLocaleString();

  return <div className="cozy-shell mt-10 pb-12">
    {isLoading && <Loader />}
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1.5fr)_380px]">
      <main>
        <img src={state.image} alt="campaign" className="h-[410px] w-full rounded-[10px] object-cover" />
        <div className="mt-4 flex items-center gap-3"><button type="button" onClick={handleShare} className="cozy-pill border px-5 py-2 text-[13px] font-extrabold" style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}>Share</button>{address?.toLowerCase() === state.owner?.toLowerCase() && <button type="button" onClick={() => { setEditDescription(state.description); setEditImage(state.image); setShowEditForm((current) => !current); }} className="cozy-pill border px-5 py-2 text-[13px] font-extrabold" style={{ borderColor: 'var(--secondary)', color: 'var(--secondary)' }}>Edit</button>}{shareMessage && <span className="text-[13px] font-bold" style={{ color: 'var(--secondary)' }}>{shareMessage}</span>}</div>
        <div className="mt-8 flex flex-wrap gap-2">
          {["Story", "Updates", "Comments", "FAQ"].map((tab) => <button key={tab} onClick={() => setActiveTab(tab)} className="cozy-pill border px-4 py-2 text-[13px] font-extrabold" style={activeTab === tab ? { background: 'var(--primary)', color: 'var(--card)', borderColor: 'var(--primary)' } : { borderColor: 'var(--secondary)', color: 'var(--secondary)' }}>{tab}</button>)}
        </div>
        <h1 className={`mt-8 font-epilogue text-[30px] font-bold ${isDarkMode ? "text-white" : "text-[#13131a]"}`}>{state.title}</h1>
        {showEditForm && address?.toLowerCase() === state.owner?.toLowerCase() && <form onSubmit={handleEdit} className="mt-5 flex flex-col gap-3"><textarea required value={editDescription} onChange={(event) => setEditDescription(event.target.value)} rows={5} className={`rounded-[6px] border p-3 font-epilogue text-[14px] outline-none ${isDarkMode ? 'border-[#3a3a43] bg-[#1c1c24] text-white' : 'border-gray-300 bg-white text-[#13131a]'}`} /><input required type="url" value={editImage} onChange={(event) => setEditImage(event.target.value)} className={`rounded-[6px] border p-3 font-epilogue text-[14px] outline-none ${isDarkMode ? 'border-[#3a3a43] bg-[#1c1c24] text-white' : 'border-gray-300 bg-white text-[#13131a]'}`} /><CustomButton btnType="submit" title="Save changes" styles="self-start bg-[#1dc071]" /></form>}
        {activeTab === "Story" && <p className={`mt-5 whitespace-pre-line font-epilogue text-[16px] leading-[28px] ${isDarkMode ? "text-[#b2b3bd]" : "text-[#666]"}`}>{state.description}</p>}
        {activeTab === "Updates" && <div className="mt-6">
          {address?.toLowerCase() === state.owner?.toLowerCase() && <form onSubmit={handlePostUpdate} className="mb-8 flex flex-col gap-3"><textarea required value={updateText} onChange={(event) => setUpdateText(event.target.value)} placeholder="Share an update with your backers" rows={4} className={`rounded-[6px] border p-3 font-epilogue text-[14px] outline-none ${isDarkMode ? "border-[#3a3a43] bg-[#1c1c24] text-white" : "border-gray-300 bg-white text-[#13131a]"}`} /><CustomButton btnType="submit" title={isPosting ? "Posting..." : "Post update"} styles="self-start bg-[#1dc071]" /></form>}
          <div className="flex flex-col gap-5">{updates.length === 0 ? <p className="font-epilogue text-[14px] text-[#808191]">No updates yet.</p> : updates.map((item, index) => <article key={`${item.timestamp}-${index}`} className={`border-l-2 border-[#1dc071] pl-4 ${isDarkMode ? "text-[#b2b3bd]" : "text-[#666]"}`}><p className="font-epilogue text-[12px] text-[#808191]">{formatTimestamp(item.timestamp)}</p><p className="mt-2 whitespace-pre-line font-epilogue text-[15px] leading-[25px]">{item.text}</p></article>)}</div>
        </div>}
        {activeTab === "Comments" && <div className="mt-6">
          <form onSubmit={handlePostComment} className="mb-8 flex flex-col gap-3"><textarea required value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder={address ? "Add a comment" : "Connect your wallet to comment"} rows={3} disabled={!address} className={`rounded-[6px] border p-3 font-epilogue text-[14px] outline-none disabled:cursor-not-allowed disabled:opacity-60 ${isDarkMode ? "border-[#3a3a43] bg-[#1c1c24] text-white" : "border-gray-300 bg-white text-[#13131a]"}`} /><CustomButton btnType="submit" title={isPosting ? "Posting..." : "Post comment"} styles="self-start bg-[#1dc071]" /></form>
          <div className="flex flex-col gap-3">{comments.length === 0 ? <p className="font-epilogue text-[14px] text-[#808191]">No comments yet.</p> : comments.map((item, index) => <article key={`${item.timestamp}-${index}`} className={`rounded-[6px] p-4 ${isDarkMode ? "bg-[#1c1c24]" : "bg-slate-100"}`}><div className="flex flex-wrap justify-between gap-2"><span className="break-all font-epilogue text-[12px] font-semibold"><AddressName address={item.author} /></span><span className="font-epilogue text-[12px] text-[#808191]">{formatTimestamp(item.timestamp)}</span></div><p className={`mt-2 whitespace-pre-line font-epilogue text-[14px] leading-[22px] ${isDarkMode ? "text-[#b2b3bd]" : "text-[#666]"}`}>{item.text}</p></article>)}</div>
        </div>}
        <div className={`mt-10 rounded-[10px] border p-5 ${isDarkMode ? "border-[#3a3a43] bg-[#1c1c24]" : "border-gray-200 bg-white"}`}>
          <p className="font-epilogue text-[12px] font-bold uppercase tracking-[1px] text-[#808191]">Meet the creator</p>
          <div className="mt-3 flex items-center gap-3"><img src={thirdweb} alt="creator" className="h-9 w-9 rounded-full bg-[var(--secondary)] p-2" /><p className="break-all text-[14px] font-semibold"><AddressName address={state.owner} /></p></div>
          <button onClick={() => navigate("/profile")} className="mt-4 font-epilogue text-[13px] font-bold text-[#1dc071]">View {creatorCampaigns.length || "their"} other campaigns</button>
        </div>
        <section className="mt-10"><div className="flex items-center justify-between"><h2 className={`font-epilogue text-[18px] font-bold ${isDarkMode ? "text-white" : "text-[#13131a]"}`}>Backers</h2><button onClick={fetchDonators} className="font-epilogue text-[13px] font-bold text-[#1dc071]">Refresh</button></div><div className="mt-4 flex flex-col gap-2">{donators.map((item, index) => <div key={`${item.donator}-${index}`} className="cozy-card flex justify-between p-3 text-[13px]"><AddressName address={item.donator} /><strong style={{ color: 'var(--secondary)' }}>{item.donation} ETH</strong></div>)}</div></section>
      </main>
      <aside className="h-fit lg:sticky lg:top-6"><div className="cozy-card p-6">
        <div className="ribbon"><div className="ribbon-fill" style={{ width: `${percentage}%` }} /><span className="ribbon-marker" style={{ left: `${Math.max(3, Math.min(97, percentage))}%` }} /></div>
        <p className="mt-4 font-epilogue text-[28px] font-bold text-[#1dc071]">{state.amountCollected} ETH</p><p className="font-epilogue text-[13px] text-[#808191]">raised of {state.target} ETH goal</p>
        <div className="mt-6 grid grid-cols-3 gap-3 border-y border-[#3a3a43] py-5"><div><strong className={isDarkMode ? "text-white" : "text-[#13131a]"}>{donators.length}</strong><p className="mt-1 text-[12px] text-[#808191]">backers</p></div><div><strong className={isDarkMode ? "text-white" : "text-[#13131a]"}>{remainingDays}</strong><p className="mt-1 text-[12px] text-[#808191]">days left</p></div><div><strong className={isDarkMode ? "text-white" : "text-[#13131a]"}>{percentage}%</strong><p className="mt-1 text-[12px] text-[#808191]">funded</p></div></div>
        {tiers.length > 0 && <div className="mt-6"><h2 className={`font-epilogue text-[16px] font-bold ${isDarkMode ? "text-white" : "text-[#13131a]"}`}>Choose a reward</h2><div className="mt-3 flex flex-col gap-2">{tiers.map((tier, index) => <button type="button" key={`${tier.name}-${index}`} onClick={() => setAmount(tier.minAmount)} className={`rounded-[6px] border p-3 text-left transition ${isDarkMode ? "border-[#3a3a43] hover:border-[#1dc071]" : "border-gray-200 hover:border-[#1dc071]"}`}><div className="flex items-center justify-between gap-2"><span className={`font-epilogue text-[14px] font-bold ${isDarkMode ? "text-white" : "text-[#13131a]"}`}>{tier.name}</span><span className="font-epilogue text-[13px] font-bold text-[#1dc071]">{tier.minAmount} ETH+</span></div><p className="mt-1 font-epilogue text-[12px] text-[#808191]">{tier.description}</p></button>)}</div></div>}
        {isSuccessful && address?.toLowerCase() === state.owner?.toLowerCase() && !state.withdrawn && <CustomButton btnType="button" title="Withdraw funds" styles="mt-4 w-full bg-[#1dc071]" handleClick={handleWithdraw} />}
        {canClaimRefund && <CustomButton btnType="button" title="Claim refund" styles="mt-4 w-full bg-[#8c6dfd]" handleClick={handleRefund} />}
        {!isPastDeadline && <><h2 className={`mt-6 font-epilogue text-[18px] font-bold ${isDarkMode ? "text-white" : "text-[#13131a]"}`}>Back this project</h2><input type="number" placeholder="ETH 0.1" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} className={`mt-4 w-full rounded-[6px] border bg-transparent p-3 font-epilogue outline-none ${isDarkMode ? "border-[#3a3a43] text-white" : "border-gray-300 text-[#13131a]"}`} /><CustomButton btnType="button" title="Pledge now" styles="mt-4 w-full bg-[#1dc071]" handleClick={handleDonate} /></>}
      </div></aside>
    </div>
    <SuccessModal isOpen={showSuccessModal} message="Thank you for your donation! Your contribution helps make this campaign a success." onClose={() => { setShowSuccessModal(false); navigate("/"); }} />
  </div>;
};

export default CampaignDetails;
