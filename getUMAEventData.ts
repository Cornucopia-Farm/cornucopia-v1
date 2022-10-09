import { TurnSharpLeft } from '@mui/icons-material';
import { ethers } from 'ethers';

const escrowContractAddress = process.env.ESCROW_ADDRESS!;

export type Request = {
    currency: any; // WETH contract object
    reward: number;
    finalFee: number;
    bond: number;
    customLiveness: number;
    proposer: string; // Address
    disputer: string | undefined; // Address
    proposedPrice: number;
    expirationTime: number;
};

export const getUMAEventData = (umaContract: any, escrowContract: any, provider: any, eventName: string, creatorAddress: string, hunterAddress: string, bountyAppId: string) => {
    const identifier = ethers.utils.toUtf8Bytes("UMIP-107"); // might need to change this to just be string
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
        const filter = umaContract.filters.ProposePrice(escrowContractAddress, identifier);
        const parsedLogs = provider.getLogs(filter).then( (logs:any) => {
            logs.map((log: any) => {
                ifacePropose.parseLog(log);
            });
        });

        const filterDisputeInitiated = escrowContract.filters.Disputed(creatorAddress, hunterAddress, bountyAppId);
        const logsDisputeInitiated = provider.getLogs(filterDisputeInitiated)[0]; // We know that only 1 log for this creator, hunter, bountyAppId triple

        parsedLogs.forEach( (parsedLog: any) => {
            if (parsedLog.request.proposer === creatorAddress && parsedLog.request.timestamp === logsDisputeInitiated.timestamp) { // Know we have the right UMA loog if proposer is the creator and timestamp is the same as the one emmitted from disputeInitiated call which specified the timestamp in the request struct
                timestamp = parsedLog.timestamp;
                ancillaryData = parsedLog.ancillaryData;
                request.currency = parsedLog.request.currency;
                request.reward = parsedLog.request.reward;
                request.finalFee = parsedLog.request.finalFee; 
                request.bond = parsedLog.request.bond;
                request.customLiveness = parsedLog.request.customLiveness;
                request.proposer = parsedLog.request.proposer;
                request.proposedPrice = parsedLog.request.proposedPrice;
                request.expirationTime = parsedLog.request.expirationTime;
                // Hunter hasn't responded to dispute yet so no disputer set in UMA request struct
                return; // Break out of forEach loop b/c we have the data that we need
            }  
        });  
    } else if (eventName === 'dispute') {
        const filter = umaContract.filters.DisputePrice(escrowContractAddress, identifier);
        const parsedLogs = provider.getLogs(filter).then( (logs:any) => {
            logs.map((log: any) => {
                ifacePropose.parseLog(log);
            });
        });

        const filterDisputeInitiated = escrowContract.filters.Disputed(creatorAddress, hunterAddress, bountyAppId);
        const logsDisputeInitiated = provider.getLogs(filterDisputeInitiated)[0]; // We know that only 1 log for this creator, hunter, bountyAppId triple

        parsedLogs.forEach( (parsedLog: any) => {
            if (parsedLog.request.proposer === creatorAddress && parsedLog.request.timestamp === logsDisputeInitiated.timestamp) { // Know we have the right UMA loog if proposer is the creator and timestamp is the same as the one emmitted from disputeInitiated call which specified the timestamp in the request struct
                timestamp = parsedLog.timestamp;
                ancillaryData = parsedLog.ancillaryData;
                request.currency = parsedLog.request.currency;
                request.reward = parsedLog.request.reward;
                request.finalFee = parsedLog.request.finalFee; 
                request.bond = parsedLog.request.bond;
                request.customLiveness = parsedLog.request.customLiveness;
                request.proposer = parsedLog.request.proposer;
                request.proposedPrice = parsedLog.request.proposedPrice;
                request.expirationTime = parsedLog.request.expirationTime;
                request.disputer = parsedLog.request.disputer
                return; // Break out of forEach loop b/c we have the data that we need
            }  
        });
    }

    return {timestamp, ancillaryData, request};
};
