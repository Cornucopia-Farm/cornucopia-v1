import { upgrades } from 'hardhat';
import { ethers } from 'ethers';
import cornucopiaABI from '../out/Cornucopia.sol/Cornucopia.json'; 

async function main() {
    const bytecode = ''; // Get contract bytecode by forge inspect Escrow bytecode > ../escrowBytecode.txt and read-in from file
    const signer = new ethers.Wallet(process.env.DEPLOYER!); // set sk for deployer address in env
    const cornucopiaFactoryUpgrade = new ethers.ContractFactory(cornucopiaABI['abi'], bytecode, signer);
    const cornucopiaAddress = ''; // Fill this in

    const cornucopiaContractUpgrade = await upgrades.upgradeProxy(cornucopiaAddress, cornucopiaFactoryUpgrade);
    console.log("Cornucopia upgrade");
}

main();

