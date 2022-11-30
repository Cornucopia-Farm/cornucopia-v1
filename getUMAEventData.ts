import { ethers } from 'ethers';

const escrowContractAddress = process.env.ESCROW_ADDRESS!;

export type Request = {
    currency: string; // WETH contract object: address
    reward: number;
    finalFee: number;
    bond: number;
    customLiveness: number;
    proposer: string; // Address
    disputer: string; // Address
    proposedPrice: number;
    expirationTime: number;
    settled: boolean;
    resolvedPrice: number;
};

export const getUMAEventData = async (umaContract: any, escrowContract: any, provider: any, eventName: string, creatorAddress: string, hunterAddress: string, bountyAppId: string) => {
    // const identifier = ethers.utils.toUtf8Bytes("YES_OR_NO_QUERY"); // might need to change this to just be string
    const identifier = "0x5945535f4f525f4e4f5f51554552590000000000000000000000000000000000";
   
    let timestamp = 0;
    let ancillaryData = '';
    const request = {} as Request; // should make this its own struct

    if (eventName === 'propose') {
        const filter = umaContract.filters.ProposePrice(escrowContract.address, identifier);
        const parsedLogs = await umaContract.queryFilter(filter);

        const filterDisputeInitiated = escrowContract.filters.Disputed(creatorAddress, hunterAddress, bountyAppId);
        const logsDisputeInitiated = await escrowContract.queryFilter(filterDisputeInitiated); 
        
        await Promise.all([parsedLogs, logsDisputeInitiated]);

        parsedLogs.forEach( (parsedLog: any) => {
            if (parsedLog.args.request.proposer === creatorAddress && parsedLog.args.timestamp === logsDisputeInitiated[0].args.timestamp) { // Know we have the right UMA loog if proposer is the creator and timestamp is the same as the one emmitted from disputeInitiated call which specified the timestamp in the request struct
                timestamp = parsedLog.args.timestamp;
                ancillaryData = parsedLog.args.ancillaryData;
                request.currency = parsedLog.args.request.currency;
                request.reward = parsedLog.args.request.reward;
                request.finalFee = parsedLog.args.request.finalFee; 
                request.bond = parsedLog.args.request.bond;
                request.customLiveness = parsedLog.args.request.customLiveness;
                request.proposer = parsedLog.args.request.proposer;
                request.proposedPrice = parsedLog.args.request.proposedPrice;
                request.expirationTime = parsedLog.args.request.expirationTime;
                request.disputer = parsedLog.args.request.disputer
                request.settled = parsedLog.args.request.settled;
                request.resolvedPrice = parsedLog.args.request.resolvedPrice;
                return; // Break out of forEach loop b/c we have the data that we need
            }  
        });  
    } else if (eventName === 'dispute') {
        const filter = umaContract.filters.DisputePrice(escrowContractAddress, identifier);
        const parsedLogs = await umaContract.queryFilter(filter);

        const filterDisputeInitiated = escrowContract.filters.Disputed(creatorAddress, hunterAddress, bountyAppId);
        const logsDisputeInitiated = await escrowContract.queryFilter(filterDisputeInitiated);
       
        parsedLogs.forEach( (parsedLog: any) => {
            if (parsedLog.args.request.proposer === creatorAddress && parsedLog.args.request.disputer === hunterAddress && parsedLog.args.timestamp === logsDisputeInitiated[0].args.timestamp) { // Know we have the right UMA log if proposer is the creator, disputer is hunter, and timestamp is the same as the one emmitted from disputeInitiated call which specified the timestamp in the request struct
                timestamp = parsedLog.args.timestamp;
                ancillaryData = parsedLog.args.ancillaryData;
                request.currency = parsedLog.args.request.currency;
                request.reward = parsedLog.args.request.reward;
                request.finalFee = parsedLog.args.request.finalFee; 
                request.bond = parsedLog.args.request.bond;
                request.customLiveness = parsedLog.args.request.customLiveness;
                request.proposer = parsedLog.args.request.proposer;
                request.proposedPrice = parsedLog.args.request.proposedPrice;
                request.expirationTime = parsedLog.args.request.expirationTime;
                request.disputer = parsedLog.args.request.disputer;
                request.settled = parsedLog.args.request.settled;
                request.resolvedPrice = parsedLog.args.request.resolvedPrice;
                return; // Break out of forEach loop b/c we have the data that we need
            }  
        });
    }

    return {timestamp, ancillaryData, request};
};
