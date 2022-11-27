export type BountyOutcome = {
    creatorRefunded: boolean;
    hunterForcePayout: boolean;
    disputed: boolean;
    tie: boolean;
    hunterWins: boolean;
    creatorWins: boolean;
    normalPayout: boolean;
};

export const getEscrowEventData = async (escrowContract: any, eventName: string, creatorAddress: string, hunterAddress: string, bountyAppId: string) => {
    const bountyOutcome = {} as BountyOutcome;
    if (eventName === 'finished') {
        const filterDisputeRespondedTo = escrowContract.filters.DisputedRespondedTo(creatorAddress, hunterAddress, bountyAppId);
        const logsDisputeRespondedTo = await escrowContract.queryFilter(filterDisputeRespondedTo);

        const filterFundsForceSentToHunter = escrowContract.filter.FundsForceSentToHunter(creatorAddress, hunterAddress, bountyAppId);
        const logsFundsForceSentToHunter = await escrowContract.queryFilter(filterFundsForceSentToHunter); 

        const filterFundsWithdrawnToCreator = escrowContract.filter.FundsWithdrawnToCreator(creatorAddress, hunterAddress, bountyAppId);
        const logsFundsWithdrawnToCreator = await escrowContract.queryFilter(filterFundsWithdrawnToCreator);

        const filterFundsSent = escrowContract.filter.FundsSent(creatorAddress, hunterAddress, bountyAppId);
        const logsFundsSent = escrowContract.queryFilter(filterFundsSent);

        await Promise.resolve([logsDisputeRespondedTo, logsFundsForceSentToHunter, logsFundsWithdrawnToCreator, logsFundsSent]);

        if (logsFundsWithdrawnToCreator.length > 0) { // Creator was refunded
            bountyOutcome.creatorRefunded = true;
            return bountyOutcome;
        } else if (logsFundsForceSentToHunter.length > 0) { // Hunter was force payed out
            bountyOutcome.hunterForcePayout = true;
            return bountyOutcome;
        } else if (logsDisputeRespondedTo.length > 0 && logsFundsSent.length > 0) { // There was a dispute
            bountyOutcome.disputed = true;
            if (logsFundsSent[0].args.message === "Funds sent back to creator!") { // Create won dispute
                bountyOutcome.creatorWins = true;
            } else if (logsFundsSent[0].args.message === "Funds sent to hunter!") { // Hunter wins dispute
                bountyOutcome.hunterWins = true;
            } else if (logsFundsSent[0].args.message === "Half of funds sent back to creator and then to hunter!") { // Tie
                bountyOutcome.tie = true;
            }
            return bountyOutcome;
        } else if (logsFundsSent.length > 0) {
            bountyOutcome.normalPayout = true; 
        }
        return bountyOutcome;   
    }
};