const { expect } = require("chai");
const { ethers, network } = require("hardhat");

const toWei = (value) => ethers.utils.parseEther(value);

async function createCampaign(contract, owner, target, duration = 3600) {
  const deadline = (await ethers.provider.getBlock("latest")).timestamp + duration;
  await contract.connect(owner).createCampaign(
    owner.address,
    "Test campaign",
    "A test campaign",
    toWei(target),
    deadline,
    "https://example.com/image.png",
    "Technology",
    []
  );
  return deadline;
}

async function createCampaignWithOptions(contract, caller, options = {}) {
  const deadline = options.deadline || (await ethers.provider.getBlock("latest")).timestamp + 3600;
  return contract.connect(caller).createCampaign(
    options.owner || caller.address,
    options.title || "Test campaign",
    options.description || "A test campaign",
    options.target === undefined ? toWei("1") : options.target,
    deadline,
    options.image || "https://example.com/image.png",
    options.category === undefined ? "Technology" : options.category,
    options.tiers || []
  );
}

async function passDeadline() {
  await network.provider.send("evm_increaseTime", [3601]);
  await network.provider.send("evm_mine");
}

async function expectRevert(transaction, reason) {
  try {
    await transaction;
    expect.fail("Expected transaction to revert");
  } catch (error) {
    expect(error.message).to.include(reason);
  }
}

describe("CrowdFunding escrow", function () {
  let funding;
  let owner;
  let donor;

  beforeEach(async function () {
    [owner, donor] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("CrowdFunding");
    funding = await Factory.deploy();
    await funding.deployed();
  });

  it("allows successful withdrawal after the deadline", async function () {
    await createCampaign(funding, owner, "1");
    await funding.connect(donor).donateToCampaign(0, { value: toWei("1") });
    await passDeadline();
    const receipt = await (await funding.connect(owner).withdrawFunds(0)).wait();
    expect(receipt.events.some((event) => event.event === "FundsWithdrawn")).to.equal(true);
    expect((await ethers.provider.getBalance(funding.address)).toString()).to.equal("0");
    expect((await funding.campaigns(0)).withdrawn).to.equal(true);
  });

  it("emits campaign and donation events", async function () {
    const deadline = (await ethers.provider.getBlock("latest")).timestamp + 3600;
    const creationReceipt = await (await createCampaignWithOptions(funding, owner, { deadline })).wait();
    const creationEvent = creationReceipt.events.find((event) => event.event === "CampaignCreated");
    expect(creationEvent.args.id.toNumber()).to.equal(0);
    expect(creationEvent.args.owner).to.equal(owner.address);
    expect(creationEvent.args.target.toString()).to.equal(toWei("1").toString());
    expect(creationEvent.args.deadline.toNumber()).to.equal(deadline);
    const donationReceipt = await (await funding.connect(donor).donateToCampaign(0, { value: toWei("1") })).wait();
    const donationEvent = donationReceipt.events.find((event) => event.event === "DonationReceived");
    expect(donationEvent.args.id.toNumber()).to.equal(0);
    expect(donationEvent.args.donator).to.equal(donor.address);
    expect(donationEvent.args.amount.toString()).to.equal(toWei("1").toString());
  });

  it("rejects invalid campaign creation input", async function () {
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    await expectRevert(createCampaignWithOptions(funding, owner, { deadline: now - 1 }), "The deadline should be in future");
    await expectRevert(createCampaignWithOptions(funding, owner, { category: "" }), "Category is required");
    await expectRevert(createCampaignWithOptions(funding, owner, { target: 0 }), "Target must be greater than zero");
    await expectRevert(createCampaignWithOptions(funding, owner, { tiers: [["", toWei("1"), "description"]] }), "Tier name is required");
    await expectRevert(createCampaignWithOptions(funding, owner, { tiers: [["name", toWei("1"), ""]] }), "Tier description is required");
    await expectRevert(createCampaignWithOptions(funding, donor, { owner: owner.address }), "Owner must be caller");
  });

  it("rejects invalid donations", async function () {
    await expectRevert(funding.connect(donor).donateToCampaign(99, { value: toWei("1") }), "Campaign does not exist");
    await createCampaign(funding, owner, "1");
    await expectRevert(funding.connect(donor).donateToCampaign(0, { value: 0 }), "Donation must be greater than zero");
    await passDeadline();
    await expectRevert(funding.connect(donor).donateToCampaign(0, { value: toWei("1") }), "Campaign has ended");
  });

  it("rejects unauthorized actions and invalid campaign ids", async function () {
    await createCampaign(funding, owner, "1");
    await expectRevert(funding.connect(donor).postUpdate(0, "update"), "Only the campaign owner can post updates");
    await expectRevert(funding.connect(donor).updateCampaignDetails(0, "description", "image"), "Only the campaign owner can edit");
    await expectRevert(funding.connect(donor).withdrawFunds(0), "Only the campaign owner can withdraw");
    await expectRevert(funding.connect(owner).withdrawFunds(99), "Campaign does not exist");
    await expectRevert(funding.connect(donor).claimRefund(99), "Campaign does not exist");
  });

  it("blocks withdrawal before the deadline", async function () {
    await createCampaign(funding, owner, "1");
    await funding.connect(donor).donateToCampaign(0, { value: toWei("1") });
    await expectRevert(funding.connect(owner).withdrawFunds(0), "Campaign is still active");
  });

  it("blocks withdrawal when the target is not met", async function () {
    await createCampaign(funding, owner, "2");
    await funding.connect(donor).donateToCampaign(0, { value: toWei("1") });
    await passDeadline();
    await expectRevert(funding.connect(owner).withdrawFunds(0), "Campaign target was not met");
  });

  it("allows an eligible donor to claim a refund", async function () {
    await createCampaign(funding, owner, "2");
    await funding.connect(donor).donateToCampaign(0, { value: toWei("1") });
    await passDeadline();
    const receipt = await (await funding.connect(donor).claimRefund(0)).wait();
    expect(receipt.events.some((event) => event.event === "RefundClaimed")).to.equal(true);
    expect((await funding.contributions(0, donor.address)).toString()).to.equal("0");
    expect((await funding.campaigns(0)).amountCollected.toString()).to.equal("0");
    expect((await ethers.provider.getBalance(funding.address)).toString()).to.equal("0");
  });

  it("prevents a donor from claiming the same refund twice", async function () {
    await createCampaign(funding, owner, "2");
    await funding.connect(donor).donateToCampaign(0, { value: toWei("1") });
    await passDeadline();
    await funding.connect(donor).claimRefund(0);
    await expectRevert(funding.connect(donor).claimRefund(0), "No refundable contribution");
  });

  it("keeps historical donation records after a refund", async function () {
    await createCampaign(funding, owner, "2");
    await funding.connect(donor).donateToCampaign(0, { value: toWei("1") });
    await passDeadline();
    await funding.connect(donor).claimRefund(0);
    const donations = await funding.getDonators(0);
    expect(donations[0]).to.deep.equal([donor.address]);
    expect(donations[1][0].toString()).to.equal(toWei("1").toString());
  });

  it("handles campaign pagination boundaries and owner ids", async function () {
    await createCampaign(funding, owner, "1");
    await createCampaign(funding, donor, "1");
    await createCampaign(funding, owner, "1");
    expect((await funding["getCampaigns(uint256,uint256)"](99, 10)).length).to.equal(0);
    expect((await funding["getCampaigns(uint256,uint256)"](0, 0)).length).to.equal(0);
    expect((await funding["getCampaigns(uint256,uint256)"](1, 10)).length).to.equal(2);
    const result = await funding.getCampaignsByOwner(owner.address);
    expect(result[1].map((id) => id.toNumber())).to.deep.equal([0, 2]);
  });
});
