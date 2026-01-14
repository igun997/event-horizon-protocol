import { expect } from 'chai';
import { ethers } from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { TalismanToken } from '../typechain-types';

describe('TalismanToken', function () {
  async function deployTokenFixture() {
    const [owner, user1, user2] = await ethers.getSigners();
    const initialSupply = ethers.parseEther('1000000');

    const TalismanToken = await ethers.getContractFactory('TalismanToken');
    const token = await TalismanToken.deploy(owner.address, initialSupply);

    return { token, owner, user1, user2, initialSupply };
  }

  describe('Deployment', function () {
    it('Should set the correct name and symbol', async function () {
      const { token } = await loadFixture(deployTokenFixture);
      expect(await token.name()).to.equal('Talisman');
      expect(await token.symbol()).to.equal('TLSM');
    });

    it('Should mint initial supply to owner', async function () {
      const { token, owner, initialSupply } = await loadFixture(deployTokenFixture);
      expect(await token.balanceOf(owner.address)).to.equal(initialSupply);
    });

    it('Should set the correct owner', async function () {
      const { token, owner } = await loadFixture(deployTokenFixture);
      expect(await token.owner()).to.equal(owner.address);
    });
  });

  describe('Minting', function () {
    it('Should allow owner to mint tokens', async function () {
      const { token, owner, user1 } = await loadFixture(deployTokenFixture);
      const mintAmount = ethers.parseEther('1000');

      await token.mint(user1.address, mintAmount);
      expect(await token.balanceOf(user1.address)).to.equal(mintAmount);
    });

    it('Should reject minting from non-owner', async function () {
      const { token, user1, user2 } = await loadFixture(deployTokenFixture);
      const mintAmount = ethers.parseEther('1000');

      await expect(
        token.connect(user1).mint(user2.address, mintAmount)
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });

  describe('Transfers', function () {
    it('Should transfer tokens between accounts', async function () {
      const { token, owner, user1 } = await loadFixture(deployTokenFixture);
      const transferAmount = ethers.parseEther('100');

      await token.transfer(user1.address, transferAmount);
      expect(await token.balanceOf(user1.address)).to.equal(transferAmount);
    });

    it('Should fail if sender has insufficient balance', async function () {
      const { token, user1, user2 } = await loadFixture(deployTokenFixture);
      const transferAmount = ethers.parseEther('100');

      await expect(
        token.connect(user1).transfer(user2.address, transferAmount)
      ).to.be.revertedWith('ERC20: transfer amount exceeds balance');
    });
  });

  describe('Burning', function () {
    it('Should allow users to burn their tokens', async function () {
      const { token, owner, initialSupply } = await loadFixture(deployTokenFixture);
      const burnAmount = ethers.parseEther('100');

      await token.burn(burnAmount);
      expect(await token.balanceOf(owner.address)).to.equal(initialSupply - burnAmount);
    });
  });
});
