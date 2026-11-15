// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

contract CrowdFunding {
    enum Status { Active, Successful, Failed, Withdrawn }

    struct Campaign {
        address owner;
        string title;
        string description;
        uint256 target;
        uint256 deadline;
        uint256 amountCollected;
        string image;
        string category;
        address[] donators;
        uint256[] donations;
        bool withdrawn;
    }

    struct Update {
        address author;
        string text;
        uint256 timestamp;
    }

    struct Comment {
        address author;
        string text;
        uint256 timestamp;
    }

    struct Tier {
        string name;
        uint256 minAmount;
        string description;
    }

    struct CampaignSummary {
        address owner;
        string title;
        string description;
        uint256 target;
        uint256 deadline;
        uint256 amountCollected;
        string image;
        string category;
        bool withdrawn;
    }

    

    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => Update[]) public updates;
    mapping(uint256 => Comment[]) public comments;
    mapping(uint256 => Tier[]) public tiers;
    mapping(uint256 => mapping(address => uint256)) public contributions;
    bool private locked;
    uint256 public constant MAX_CAMPAIGN_DURATION = 365 days;

    event CampaignCreated(uint256 indexed id, address indexed owner, uint256 target, uint256 deadline);
    event DonationReceived(uint256 indexed id, address indexed donator, uint256 amount);
    event UpdatePosted(uint256 indexed id, address indexed author, string text, uint256 timestamp);
    event CommentPosted(uint256 indexed id, address indexed author, string text, uint256 timestamp);
    event FundsWithdrawn(uint256 indexed id, address indexed owner, uint256 amount);
    event RefundClaimed(uint256 indexed id, address indexed donator, uint256 amount);
    event CampaignDetailsUpdated(uint256 indexed id, string description, string image);

    uint256 public numberOfCampaigns = 0;

    modifier nonReentrant() {
        require(!locked, "Reentrant call");
        locked = true;
        _;
        locked = false;
    }

    function createCampaign(
        address _owner,
        string memory _title,
        string memory _description,
        uint256 _target,
        uint256 _deadline,
        string memory _image,
        string memory _category,
        Tier[] memory _tiers
    ) public returns (uint256) {
        Campaign storage campaign = campaigns[numberOfCampaigns];

        require(
            _deadline > block.timestamp,
            "The deadline should be in future"
        );
        require(_deadline <= block.timestamp + MAX_CAMPAIGN_DURATION, "The deadline is too far in future");
        require(_owner == msg.sender, "Owner must be caller");
        require(bytes(_category).length > 0, "Category is required");
        require(_target > 0, "Target must be greater than zero");

        campaign.owner = _owner;
        campaign.title = _title;
        campaign.description = _description;
        campaign.target = _target;
        campaign.deadline = _deadline;
        campaign.amountCollected = 0;
        campaign.image = _image;
        campaign.category = _category;
        for (uint256 i = 0; i < _tiers.length; i++) {
            require(bytes(_tiers[i].name).length > 0, "Tier name is required");
            require(bytes(_tiers[i].description).length > 0, "Tier description is required");
            tiers[numberOfCampaigns].push(_tiers[i]);
        }

        numberOfCampaigns++;

        emit CampaignCreated(numberOfCampaigns - 1, _owner, _target, _deadline);
        return numberOfCampaigns - 1;
    }

    function donateToCampaign(uint256 _id) public payable {
        require(campaigns[_id].owner != address(0), "Campaign does not exist");
        require(block.timestamp < campaigns[_id].deadline, "Campaign has ended");
        require(msg.value > 0, "Donation must be greater than zero");
        uint256 amount = msg.value;
        Campaign storage campaign = campaigns[_id];
        campaign.donators.push(msg.sender);
        campaign.donations.push(amount);
        contributions[_id][msg.sender] += amount;
        campaign.amountCollected += amount;
        emit DonationReceived(_id, msg.sender, amount);
    }

    function updateCampaignDetails(uint256 _id, string memory _description, string memory _image) public {
        Campaign storage campaign = campaigns[_id];
        require(campaign.owner == msg.sender, "Only the campaign owner can edit");
        require(bytes(_description).length > 0, "Description is required");
        require(bytes(_image).length > 0, "Image is required");
        campaign.description = _description;
        campaign.image = _image;
        emit CampaignDetailsUpdated(_id, _description, _image);
    }

    function getStatus(uint256 _id) public view returns (Status) {
        Campaign storage campaign = campaigns[_id];
        if (campaign.withdrawn) return Status.Withdrawn;
        if (block.timestamp < campaign.deadline) return Status.Active;
        return campaign.amountCollected >= campaign.target ? Status.Successful : Status.Failed;
    }

    function withdrawFunds(uint256 _id) public nonReentrant {
        Campaign storage campaign = campaigns[_id];
        require(campaign.owner != address(0), "Campaign does not exist");
        require(campaign.owner == msg.sender, "Only the campaign owner can withdraw");
        require(block.timestamp >= campaign.deadline, "Campaign is still active");
        require(campaign.amountCollected >= campaign.target, "Campaign target was not met");
        require(!campaign.withdrawn, "Funds already withdrawn");
        campaign.withdrawn = true;
        uint256 amount = campaign.amountCollected;
        (bool sent, ) = payable(campaign.owner).call{value: amount}("");
        require(sent, "Transfer failed");
        emit FundsWithdrawn(_id, campaign.owner, amount);
    }

    function claimRefund(uint256 _id) public nonReentrant {
        Campaign storage campaign = campaigns[_id];
        require(campaign.owner != address(0), "Campaign does not exist");
        require(block.timestamp >= campaign.deadline, "Campaign is still active");
        require(campaign.amountCollected < campaign.target, "Campaign target was met");
        uint256 amount = contributions[_id][msg.sender];
        require(amount > 0, "No refundable contribution");
        contributions[_id][msg.sender] = 0;
        campaign.amountCollected -= amount;
        (bool sent, ) = payable(msg.sender).call{value: amount}("");
        require(sent, "Refund transfer failed");
        emit RefundClaimed(_id, msg.sender, amount);
    }

    function postUpdate(uint256 _id, string memory _text) public {
        require(campaigns[_id].owner == msg.sender, "Only the campaign owner can post updates");
        require(bytes(_text).length > 0, "Update text is required");
        updates[_id].push(Update(msg.sender, _text, block.timestamp));
        emit UpdatePosted(_id, msg.sender, _text, block.timestamp);
    }

    function postComment(uint256 _id, string memory _text) public {
        require(campaigns[_id].owner != address(0), "Campaign does not exist");
        require(bytes(_text).length > 0, "Comment text is required");
        comments[_id].push(Comment(msg.sender, _text, block.timestamp));
        emit CommentPosted(_id, msg.sender, _text, block.timestamp);
    }

    function getUpdates(uint256 _id) public view returns (Update[] memory) {
        return updates[_id];
    }

    function getComments(uint256 _id) public view returns (Comment[] memory) {
        return comments[_id];
    }

    // Tier amounts describe off-chain rewards; this contract does not enforce reward fulfillment.
    function getTiers(uint256 _id) public view returns (Tier[] memory) {
        return tiers[_id];
    }

    // Returns append-only historical donation records, not current balances per donor.
    function getDonators(
        uint256 _id
    ) public view returns (address[] memory, uint256[] memory) {
        return (campaigns[_id].donators, campaigns[_id].donations);
    }

    // Deprecated: use getCampaigns(offset, limit) or getCampaignSummaries(offset, limit).
    function getCampaigns() public view returns (Campaign[] memory) {
        return getCampaigns(0, numberOfCampaigns);
    }

    function getCampaigns(uint256 _offset, uint256 _limit) public view returns (Campaign[] memory) {
        if (_offset >= numberOfCampaigns || _limit == 0) return new Campaign[](0);
        uint256 end = _offset + _limit;
        if (end > numberOfCampaigns) end = numberOfCampaigns;
        Campaign[] memory page = new Campaign[](end - _offset);
        for (uint256 i = _offset; i < end; i++) {
            page[i - _offset] = campaigns[i];
        }
        return page;
    }

    function getCampaignSummaries(uint256 _offset, uint256 _limit) public view returns (CampaignSummary[] memory) {
        if (_offset >= numberOfCampaigns || _limit == 0) {
            return new CampaignSummary[](0);
        }

        uint256 end = _offset + _limit;
        if (end > numberOfCampaigns) end = numberOfCampaigns;
        uint256 length = end - _offset;
        CampaignSummary[] memory summaries = new CampaignSummary[](length);

        for (uint256 i = 0; i < length; i++) {
            Campaign storage campaign = campaigns[_offset + i];
            summaries[i] = CampaignSummary(
                campaign.owner,
                campaign.title,
                campaign.description,
                campaign.target,
                campaign.deadline,
                campaign.amountCollected,
                campaign.image,
                campaign.category,
                campaign.withdrawn
            );
        }
        return summaries;
    }

    function getCampaignsByOwner(address _owner) public view returns (Campaign[] memory, uint256[] memory) {
        uint256 count;
        for (uint256 i = 0; i < numberOfCampaigns; i++) {
            if (campaigns[i].owner == _owner) count++;
        }
        Campaign[] memory owned = new Campaign[](count);
        uint256[] memory ids = new uint256[](count);
        uint256 index;
        for (uint256 i = 0; i < numberOfCampaigns; i++) {
            if (campaigns[i].owner == _owner) {
                owned[index] = campaigns[i];
                ids[index++] = i;
            }
        }
        return (owned, ids);
    }
}
