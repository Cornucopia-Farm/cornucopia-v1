import { ethers, upgrades } from 'hardhat';

export async function main() {
    const provider = new ethers.providers.AlchemyProvider('goerli', process.env.ALCHEMY_API_KEY);
    const signer = new ethers.Wallet(process.env.DEPLOYER!, provider); // set sk for deployer address in env
    // const escrowFactory = await ethers.getContractFactory("Escrow", signer);

    const escrowFactory = await ethers.getContractFactory("Escrow");
    const escrowContract = await upgrades.deployProxy(escrowFactory, { unsafeAllow: ['delegatecall'], kind: 'uups', }, );
    console.log("Escrow deployed to:", escrowContract.address);
}

main();
