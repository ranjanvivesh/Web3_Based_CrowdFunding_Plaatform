import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import {
  ChainId,
  useAddress,
  useConnect,
  useContract,
  useContractWrite,
  useMetadata,
  useMetamask,
} from "@thirdweb-dev/react";
import { ethers } from "ethers";

interface ContextType {
  address: string | undefined;
  contract: any;
  createCampaign: (form: any) => Promise<any>;
  connect: () => Promise<any>;
  getCampaigns: (offset?: number, limit?: number) => Promise<any>;
  getUserCampaigns: () => Promise<any>;
  getDonations: (pId: string) => Promise<{ donator: string; donation: string }[]>;
  donate: (pId: any, amount: any) => Promise<any>;
  postUpdate: (pId: any, text: string) => Promise<any>;
  postComment: (pId: any, text: string) => Promise<any>;
  getUpdates: (pId: any) => Promise<{ author: string; text: string; timestamp: number }[]>;
  getComments: (pId: any) => Promise<{ author: string; text: string; timestamp: number }[]>;
  getTiers: (pId: any) => Promise<{ name: string; minAmount: string; description: string }[]>;
  withdrawFunds: (pId: any) => Promise<any>;
  claimRefund: (pId: any) => Promise<any>;
  updateCampaignDetails: (pId: any, description: string, image: string) => Promise<any>;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

interface StateContextProviderProps {
  children: ReactNode;
}

const StateContext = createContext<ContextType | null>(null);

export const StateContextProvider = ({
  children,
}: StateContextProviderProps): JSX.Element => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  
  // Initialize dark mode from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
    } else {
      setIsDarkMode(true); // Default to dark mode
    }
  }, []);

  // Update localStorage and DOM when theme changes
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };
  
  const { contract } = useContract(
    import.meta.env.VITE_CONTRACT_ADDRESS as string
  );
  const { mutateAsync: createCampaign } = useContractWrite(
    contract,
    "createCampaign" as any
  );
  const { mutateAsync: postUpdateWrite } = useContractWrite(contract, "postUpdate" as any);
  const { mutateAsync: postCommentWrite } = useContractWrite(contract, "postComment" as any);
  const { mutateAsync: withdrawFundsWrite } = useContractWrite(contract, "withdrawFunds" as any);
  const { mutateAsync: claimRefundWrite } = useContractWrite(contract, "claimRefund" as any);
  const { mutateAsync: updateCampaignDetailsWrite } = useContractWrite(contract, "updateCampaignDetails" as any);
  const address = useAddress();
  const connectWithMetamask = useMetamask();

  const connect = async () => {
    try {
      await connectWithMetamask({
        chainId: 11155111,
      });
    } catch (error) {
      throw new Error("Failed to connect wallet. Please ensure MetaMask is installed and try again.");
    }
  };

  const publishCampaign = async (form: any) => {
    try {
      const deadline = Math.floor(new Date(form.deadline).getTime() / 1000);
      const tiers = (form.tiers || []).map((tier: any) => [
        tier.name,
        ethers.utils.parseEther(tier.minAmount.toString()),
        tier.description,
      ]);
      const data = await createCampaign({
        args: [address, form.title, form.description, form.target, deadline, form.image, form.category, tiers],
      });
      return data;
    } catch (err) {
      throw new Error("Failed to create campaign. Please check your wallet and try again.");
    }
  };

  const parseCampaign = (campaign: any, index: number) => ({
      owner: campaign.owner,
      title: campaign.title,
      description: campaign.description,
      target: ethers.utils.formatEther(campaign.target.toString()),
      deadline: campaign.deadline.toNumber(),
      amountCollected: ethers.utils.formatEther(
        campaign.amountCollected.toString()
      ),
      image: campaign.image,
      category: campaign.category || "Uncategorized",
      withdrawn: campaign.withdrawn || false,
      pId: index,
    });

  const getCampaigns = async (offset = 0, limit?: number) => {
    if (!contract) return [];
    let campaigns;
    if (limit === undefined) {
      campaigns = await contract.call("getCampaigns");
    } else {
      try {
        campaigns = await contract.call("getCampaigns", [offset, limit]);
      } catch (error) {
        // Older deployments only have getCampaigns() until the new contract is redeployed.
        const allCampaigns = await contract.call("getCampaigns");
        campaigns = allCampaigns.slice(offset, offset + limit);
      }
    }
    const parsedCampaigns = campaigns.map((campaign: any, index: number) => parseCampaign(campaign, limit === undefined ? index : offset + index));

    return parsedCampaigns;
  };

  const getUserCampaigns = async () => {
    if (!contract || !address) return [];
    try {
      const [campaigns, ids] = await contract.call("getCampaignsByOwner", [address]);
      return campaigns.map((campaign: any, index: number) => parseCampaign(campaign, ids[index].toNumber()));
    } catch (error) {
      // Older deployments do not expose getCampaignsByOwner yet.
      const allCampaigns = await contract.call("getCampaigns");
      return allCampaigns
        .map((campaign: any, index: number) => parseCampaign(campaign, index))
        .filter((campaign: any) => campaign.owner === address);
    }
  };


  const donate = async (pId: any, amount: any) => {
    if (!contract) {
      throw new Error("Contract is not initialized. Please connect your wallet.");
    }

    try {
      // Ensure that pId is passed in an array
      const data = await contract.call("donateToCampaign", [pId], {
        value: ethers.utils.parseEther(amount.toString()),
      });
      return data;
    } catch (error) {
      throw new Error("Donation failed. Please ensure you have sufficient funds and try again.");
    }
  };



  const getDonations = async (pId: any) => {
    if (!contract) {
      throw new Error("Contract is not initialized");
    }
    if (pId === undefined || pId === null) {
      throw new Error("Project ID (pId) is required");
    }

    const donations = await contract.call('getDonators', [pId]);
    const numberOfDonations = donations[0].length;

    const parsedDonations = [];

    for (let i = 0; i < numberOfDonations; i++) {
      parsedDonations.push({
        donator: donations[0][i],
        donation: ethers.utils.formatEther(donations[1][i].toString())
      })
    }
    return parsedDonations;
  }

  const postUpdate = async (pId: any, text: string) => {
    if (!contract) throw new Error("Contract is not initialized");
    return postUpdateWrite({ args: [pId, text] });
  };

  const postComment = async (pId: any, text: string) => {
    if (!contract) throw new Error("Contract is not initialized");
    return postCommentWrite({ args: [pId, text] });
  };

  const getUpdates = async (pId: any) => {
    if (!contract) throw new Error("Contract is not initialized");
    const data = await contract.call("getUpdates", [pId]);
    return data.map((item: any) => ({ author: item.author, text: item.text, timestamp: item.timestamp.toNumber() }));
  };

  const getComments = async (pId: any) => {
    if (!contract) throw new Error("Contract is not initialized");
    const data = await contract.call("getComments", [pId]);
    return data.map((item: any) => ({ author: item.author, text: item.text, timestamp: item.timestamp.toNumber() }));
  };

  const getTiers = async (pId: any) => {
    if (!contract) throw new Error("Contract is not initialized");
    const data = await contract.call("getTiers", [pId]);
    return data.map((tier: any) => ({ name: tier.name, minAmount: ethers.utils.formatEther(tier.minAmount.toString()), description: tier.description }));
  };

  const withdrawFunds = async (pId: any) => {
    if (!contract) throw new Error("Contract is not initialized");
    return withdrawFundsWrite({ args: [pId] });
  };

  const claimRefund = async (pId: any) => {
    if (!contract) throw new Error("Contract is not initialized");
    return claimRefundWrite({ args: [pId] });
  };

  const updateCampaignDetails = async (pId: any, description: string, image: string) => {
    if (!contract) throw new Error("Contract is not initialized");
    return updateCampaignDetailsWrite({ args: [pId, description, image] });
  };
  return (
    <StateContext.Provider
      value={{
        address,
        contract,
        connect,
        createCampaign: publishCampaign,
        getCampaigns,
        getUserCampaigns,
        donate,
        getDonations,
        postUpdate,
        postComment,
        getUpdates,
        getComments,
        getTiers,
        withdrawFunds,
        claimRefund,
        updateCampaignDetails,
        isDarkMode,
        toggleDarkMode
      }}
    >
      {children}
    </StateContext.Provider>
  );
};

export const useStateContext = () => useContext(StateContext);
