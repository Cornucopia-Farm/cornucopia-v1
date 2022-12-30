import { upgrades } from 'hardhat';
import { ethers } from 'ethers';
import escrowABI from './contracts/out/Escrow.sol/Escrow.json'; 

async function main() {
    const bytecode = ''; // Get contract bytecode by forge inspect Escrow bytecode > ../escrowBytecode.txt and read-in from file
    const signer = new ethers.Wallet(process.env.DEPLOYER!); // set sk for deployer address in env
    const escrowFactoryUpgrade = new ethers.ContractFactory(escrowABI['abi'], bytecode, signer);
    const escrowAddress = ''; // Fill this in

    const escrowContractUpgrade = await upgrades.upgradeProxy(escrowAddress, escrowFactoryUpgrade);
    console.log("Escrow upgrade");
}

main();

