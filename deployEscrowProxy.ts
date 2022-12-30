import { upgrades } from 'hardhat';
import { ethers } from 'ethers';
import escrowABI from './contracts/out/Escrow.sol/Escrow.json'; 

async function main() {
    const bytecode = ''; // Get contract bytecode by forge inspect Escrow bytecode > ../escrowBytecode.txt and read-in from file
    const signer = new ethers.Wallet(process.env.DEPLOYER); // set sk for deployer address in env
    const escrowFactory = new ethers.ContractFactory(escrowABI['abi'], bytecode, signer);

    const escrowContract = await upgrades.deployProxy(escrowFactory);
    await escrowContract.deployed();
    console.log("Escrow deployed to:", escrowContract.address);
}

main();

