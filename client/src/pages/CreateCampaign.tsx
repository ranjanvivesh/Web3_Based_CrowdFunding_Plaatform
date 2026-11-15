import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CustomButton } from "../components";
import { money } from "../assets";
import { checkIfImage } from "../utils";
import { FormField } from "../components";
import { useStateContext } from "../context";
import { ethers } from "ethers";
import { Loader } from "../components";

const CreateCampaign = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const context = useStateContext();
  if (!context) {
    throw new Error("useStateContext must be used within a Provider");
  }
  const { createCampaign, isDarkMode } = context || { isDarkMode: true };
  const [form, setForm] = useState({
    name: "",
    title: "",
    description: "",
    target: "",
    deadline: "",
    image: "",
    category: "",
  });
  const [tiers, setTiers] = useState<{ name: string; minAmount: string; description: string }[]>([]);

  const handleFormFieldChange = (fieldName: any, e: any) => {
    setForm({ ...form, [fieldName]: e.target.value });
  };
  const updateTier = (index: number, field: string, value: string) => setTiers((current) => current.map((tier, tierIndex) => tierIndex === index ? { ...tier, [field]: value } : tier));

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    checkIfImage(form.image, async (exists: any) => {
      if (exists) {
        setIsLoading(true);
        await createCampaign({ ...form, tiers, target: ethers.utils.parseEther(form.target) });
        setIsLoading(false);
        navigate("/");
      } else {
        alert("Please enter a valid image url");
      }
    });
  };
  return (
    <div className="cozy-shell flex flex-col items-center justify-center gap-7 p-2 sm:p-8"
    >
      {isLoading && <Loader />}
      <div className="w-full max-w-[900px]"><p className="text-[13px] font-extrabold uppercase tracking-[2px]" style={{ color: 'var(--secondary)' }}>Bring your idea to the table</p><h1 className="mt-2 font-display text-[42px] font-bold sm:text-[52px]">Start a campaign</h1><p className="mt-3 text-[16px] leading-7" style={{ color: 'color-mix(in srgb, var(--ink) 68%, transparent)' }}>Tell people what you are making and what it will take to get there.</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-[900px] flex flex-col gap-6"
      >
        <div className="cozy-card flex flex-wrap gap-6 p-6">
          <FormField
            labelName="Your Name * "
            placeholder="Enter your name"
            inputType="text"
            value={form.name}
            handleChange={(e: any) => {
              handleFormFieldChange("name", e);
            }}
          />
          <FormField
            labelName="Campaign Title * "
            placeholder="Write a Title"
            inputType="text"
            value={form.title}
            handleChange={(e: any) => {
              handleFormFieldChange("title", e);
            }}
          />
        </div>
        <div className="cozy-card p-6"><FormField
          labelName="Story * "
          placeholder="Write Your Story"
          isTextArea
          value={form.description}
          handleChange={(e: any) => {
            handleFormFieldChange("description", e);
          }}
        /><p className="mt-3 text-[13px]" style={{ color: 'var(--secondary)' }}>A clear story helps neighbors understand why this matters.</p></div>

        <div className="cozy-card flex min-h-[100px] w-full items-center p-5"
        >
          <img
            src={money}
            alt="money"
            className="w-[40px]
          h-[40px] object-contain"
          />
          <h4 className="ml-5 font-display text-[24px] font-bold">
            You will get 100% of the raised amount
          </h4>
        </div>
        <div className="cozy-card flex flex-wrap gap-6 p-6">
          <FormField
            labelName="Goal * "
            placeholder="ETH 0.50"
            inputType="text"
            value={form.target}
            handleChange={(e: any) => {
              handleFormFieldChange("target", e);
            }}
          />
          <FormField
            labelName="End Date * "
            placeholder="End Date"
            inputType="date"
            value={form.deadline}
            handleChange={(e: any) => {
              handleFormFieldChange("deadline", e);
            }}
          />
        </div>
        <div className="cozy-card p-6"><FormField
          labelName=" Campaign image * "
          placeholder="place image url of your image"
          inputType="url"
          value={form.image}
          handleChange={(e: any) => {
            handleFormFieldChange("image", e);
          }}
        /><p className="mt-3 text-[13px]" style={{ color: 'var(--secondary)' }}>Most successful campaigns run 30–45 days.</p></div>
        <label className="cozy-card flex w-full flex-col p-6">
          <span className={`mb-[10px] font-epilogue text-[14px] font-medium ${isDarkMode ? 'text-[#dddee8]' : 'text-[#333]'}`}>Category *</span>
          <select required value={form.category} onChange={(e) => handleFormFieldChange("category", e)} className={`rounded-[10px] border px-[15px] py-[15px] font-epilogue text-[14px] outline-none ${isDarkMode ? 'border-[#3a3a43] bg-[#13131a] text-white' : 'border-gray-300 bg-white text-[#13131a]'}`}>
            <option value="" disabled>Select a category</option>
            {['Technology', 'Art', 'Games', 'Film', 'Music', 'Community', 'Education', 'Health', 'Other'].map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>
        <div className="cozy-card flex flex-col gap-4 p-6">
          <div className="flex items-center justify-between"><span className={`font-epilogue text-[14px] font-medium ${isDarkMode ? 'text-[#dddee8]' : 'text-[#333]'}`}>Pledge tiers (optional)</span>{tiers.length < 5 && <button type="button" onClick={() => setTiers([...tiers, { name: "", minAmount: "", description: "" }])} className="font-epilogue text-[13px] font-bold text-[#1dc071]">Add tier</button>}</div>
          {tiers.map((tier, index) => <div key={index} className={`grid gap-3 rounded-[10px] border p-4 md:grid-cols-3 ${isDarkMode ? 'border-[#3a3a43]' : 'border-gray-300'}`}>
            <input required value={tier.name} onChange={(e) => updateTier(index, 'name', e.target.value)} placeholder="Tier name" className={`rounded-[6px] border bg-transparent p-3 font-epilogue text-[14px] outline-none ${isDarkMode ? 'border-[#3a3a43] text-white' : 'border-gray-300 text-[#13131a]'}`} />
            <input required type="number" min="0" step="0.01" value={tier.minAmount} onChange={(e) => updateTier(index, 'minAmount', e.target.value)} placeholder="Minimum ETH" className={`rounded-[6px] border bg-transparent p-3 font-epilogue text-[14px] outline-none ${isDarkMode ? 'border-[#3a3a43] text-white' : 'border-gray-300 text-[#13131a]'}`} />
            <input required value={tier.description} onChange={(e) => updateTier(index, 'description', e.target.value)} placeholder="Short reward description" className={`rounded-[6px] border bg-transparent p-3 font-epilogue text-[14px] outline-none ${isDarkMode ? 'border-[#3a3a43] text-white' : 'border-gray-300 text-[#13131a]'}`} />
          </div>)}
        </div>
        <div className="flex justify-center items-center mt-[40px]"><CustomButton btnType="submit" title="Submit new Campaign" styles="bg-[#1dc071]" /></div>
      </form>
    </div>
  );
};

export default CreateCampaign;
