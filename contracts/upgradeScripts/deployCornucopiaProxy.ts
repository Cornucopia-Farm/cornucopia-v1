import { ethers, upgrades } from 'hardhat';

export async function main() {
    // const provider = new ethers.providers.AlchemyProvider('goerli', process.env.ALCHEMY_API_KEY);
    const provider = new ethers.providers.AlchemyProvider('mainnet', process.env.ALCHEMY_API_KEY_MAINNET);

    const signer = new ethers.Wallet(process.env.DEPLOYER!, provider); // set sk for deployer address in env

    const cornucopiaFactory = await ethers.getContractFactory("Cornucopia");
    const cornucopiaContract = await upgrades.deployProxy(cornucopiaFactory, { unsafeAllow: ['delegatecall'], kind: 'uups', }, );
    console.log("Cornucopia deployed to:", cornucopiaContract.address);
}

main();
