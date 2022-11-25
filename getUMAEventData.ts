import { TurnSharpLeft } from '@mui/icons-material';
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

    const disputeInitiatedAbi = [
        "event Disputed(address indexed creator, address indexed hunter, string indexed bountyAppId, uint32 timestamp, string message)"
    ];

    const proposeAbi = [
        "event ProposePrice(address indexed requester, bytes32 indexed identifier, uint32 timestamp, bytes ancillaryData, tuple(address proposer, address disputer, IERC20 currency, bool settled, bool refundOnDispute, int256 proposedPrice, int256 resolvedPrice, uint256 expirationTime, uint256 reward, uint256 finalFee, uint256 bond, uint256 customLiveness) request)"
    ];

    const disputeAbi = [
        "event DisputePrice(address indexed requester, bytes32 indexed identifier, uint32 timestamp, bytes ancillaryData, tuple(address proposer, address disputer, IERC20 currency, bool settled, bool refundOnDispute, int256 proposedPrice, int256 resolvedPrice, uint256 expirationTime, uint256 reward, uint256 finalFee, uint256 bond, uint256 customLiveness) request)"
    ];
    
    const ifaceDisputeInitiated = new ethers.utils.Interface(disputeInitiatedAbi);
    const ifacePropose = new ethers.utils.Interface(proposeAbi);
    const ifaceDispute = new ethers.utils.Interface(disputeAbi);

    if (eventName === 'propose') {
        const filter = umaContract.filters.ProposePrice(escrowContract.address, identifier);
        const parsedLogs = await umaContract.queryFilter(filter);

        const filterDisputeInitiated = escrowContract.filters.Disputed(creatorAddress, hunterAddress, bountyAppId);
        const logsDisputeInitiated = await escrowContract.queryFilter(filterDisputeInitiated); // We know that only 1 log for this creator, hunter, bountyAppId triple
        
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
                
                // Hunter hasn't responded to dispute yet so no disputer set in UMA request struct
                return; // Break out of forEach loop b/c we have the data that we need
            }  
        });  
    } else if (eventName === 'dispute') {
        const filter = umaContract.filters.DisputePrice(escrowContractAddress, identifier);
        const parsedLogs = await umaContract.queryFilter(filter);

        const filterDisputeRespondedTo = escrowContract.filters.DisputeRespondedTo(creatorAddress, hunterAddress, bountyAppId);
        const logsDisputeRespondedTo = await escrowContract.queryFilter(filterDisputeRespondedTo);// We know that only 1 log for this creator, hunter, bountyAppId triple

        parsedLogs.forEach( (parsedLog: any) => {
            if (parsedLog.args.request.proposer === creatorAddress && parsedLog.args.timestamp === logsDisputeRespondedTo[0].args.timestamp) { // Know we have the right UMA loog if proposer is the creator and timestamp is the same as the one emmitted from disputeInitiated call which specified the timestamp in the request struct
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
