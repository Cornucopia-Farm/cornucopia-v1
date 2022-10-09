import * as React from 'react';
import { useQuery, gql } from '@apollo/client';
import axios from 'axios';
import { ethers } from 'ethers';
import NestedAccordian from './nestedAccordion';
import Application from './application';
import escrowABI from '../cornucopia-contracts/out/Escrow.sol/Escrow.json'; // add in actual path later
import { useAccount, useContract, useSigner, useNetwork } from 'wagmi';

type Props = {
    postId: string;
    setSubmittedMap: (postId: string) => void;
};

// Escrow Contract Config
const contractConfig = {
    addressOrName: process.env.NEXT_PUBLIC_ESCROW_ADDRESS!, // contract address
    contractInterface: escrowABI['abi'], // contract abi in json or JS format
};

// const defaultIdentifier = ethers.utils.solidityKeccak256([ "string", "address", "address" ], [ "default", "0x", "0x" ]);

const SubmittedPosts: React.FC<Props> = props => {

    // Wagmi address/contract info
    const { address, isConnected } = useAccount();

    const { data: signer, isError, isLoading } = useSigner();
    const { chain } = useNetwork();

    const escrowContract = useContract({...contractConfig, signerOrProvider: signer, });

    const [submittedBountyPosts, setSubmittedBountyPosts] = React.useState(Array<JSX.Element>);
    const [thisPostData, setThisPostData] = React.useState(Array<any>);
    // const [bountyIdentifier, setBountyIdentifier] = React.useState(defaultIdentifier);
    
    // const [openContest, setOpenContest] = React.useState(false);
    // const [openPay, setOpenPay] = React.useState(false);
    // const [bountyAppId, setBountyAppId] = React.useState("default");
    // const [hunterAddress, setHunterAddress] = React.useState("0x0000000000000000000000000000000000000000");
    // const [ancillaryData, setAncillaryData] = React.useState("0x0000000000000000000000000000000000000000");
    // const [umaData, setUmaData] = React.useState({
    //     proposer: "0x0000000000000000000000000000000000000000",
    //     identifier: "100",
    //     timestamp: 10000,
    //     ancillaryData: "default",
    //     request: ethers.utils.AbiCoder.prototype.encode(
    //         ['string', 'string', 'string'],
    //         ["default", "default", "default"]
    //       )
    // });
    // const bountyExpirationTime = 2*7*24*60*60;
    // const bondAmt = ethers.utils.parseUnits("0.1", "ether"); // Hard-coded (for now) bondAmt
    // const oracleAddress = "0xAa04b5D40574Fb8C001249B24d1c6B35a207F0bD"; // Kovan Testnet Skinny Optimistic Oracle; probably need to change this bc kovan deprecated
    // const wethAddress = "0xd0A1E359811322d97991E03f863a0C30C2cF029C"; // WETH Kovan


    // commented out code for initiateDispute and payout functions--bugs here with how to set umaData request default data and the like
    // have to fix some things on contract end too!


    // this creates and sends the initiateDispute func call tx
    // const { config: initiateDisputeConfig } = usePrepareContractWrite({...contractConfig, functionName: 'initiateDispute', args: [bountyAppId, hunterAddress, oracleAddress, bondAmt, ancillaryData, wethAddress], enabled: false, });
    // const { data: initiateDisputeData, error: initiateDisputeError, isLoading: isInitiateDisputeLoading, isSuccess: isInitiateDisputeSuccess, write: initiateDispute } = useContractWrite(initiateDisputeConfig);
    // // isSuccess === true when the initiateDispute tx has been confirmed
    // const { data: initiateDisputeTxData, isSuccess: initiateDisputeTxSuccess, error: initiateDisputeTxError } = useWaitForTransaction({ hash: initiateDisputeData?.hash, enabled: false,});

    // this creates and sends the payout func call tx

    // const { config: payoutConfig } = usePrepareContractWrite({...contractConfig, functionName: 'payout', args: [bountyAppId, hunterAddress, umaData.timestamp, umaData.ancillaryData, umaData.request], enabled: false,});
    // const { data: payoutData, error: payoutError, isLoading: isPayoutLoading, isSuccess: isPayoutSuccess, write: payout } = useContractWrite(payoutConfig);
    // // isSuccess === true when the payout tx has been confirmed
    // const { data: payoutTxData, isSuccess: payoutTxSuccess, error: payoutTxError } = useWaitForTransaction({ hash: payoutData?.hash, enabled: false,});

    // const { data: bountyProgressData, error: bountyProgressError, isLoading: isBountyProgressLoading, isSuccess: isBountyProgressSuccess, refetch: bountyProgress } = useContractRead({...contractConfig, functionName: 'progress', args: [bountyIdentifier], enabled: false, }); // watch causing error not sure why rn

    // const handleCloseContestFalse = () => {
    //     setOpenContest(false);
    // };

    // const handleCloseContestTrue = (bountyAppId: string, hunterAddress: string, workLinks: Array<string>, postLinks: Array<string>) => {
    //     setOpenContest(false);
    //     const thisAncillaryData = "q:Did this bounty hunter`'`s work fulfill the bounty specifications?" + " Work: " + workLinks.toString() + ", Specification: " +  postLinks.toString() + ", p1:0, p2:1, p3:0.5";
    //     setAncillaryData(thisAncillaryData);
    //     setBountyAppId(bountyAppId);
    //     setHunterAddress(hunterAddress);
    //     // initiateDispute?.();
    // };

    // const handleClosePayFalse = () => {
    //     setOpenPay(false);
    // };

    // const handleClosePayTrue = (bountyAppId: string, hunterAddress: string) => {
    //     setOpenPay(false);
    //     setBountyAppId(bountyAppId);
    //     setHunterAddress(hunterAddress);
    //     // payout?.();
    // };

    // const handleClickOpenContest = () => {
    //     setOpenContest(true);
    // };

    // const handleClickOpenPay = () => {
    //     setOpenPay(true);
    // };
    
    const { data, loading, error, startPolling } = useQuery(GETWORKSUBMITTEDPOSTS, { variables: { postId: props.postId, chain: chain?.network! }, });
    startPolling(10000);

    if (error) {
        console.error(error);
    }
    
    const bountyIds = data?.transactions.edges.map((edge: any) => edge.node.id);
    
    if (!loading && bountyIds.length > 0) {
        props.setSubmittedMap(props.postId);
    }

    const getSubmittedPosts = async (openBountyIds: Array<string>) => {

        let submittedBountiesApps: Array<JSX.Element> = [];

        let postDataArr: Array<any> = []; // add postData to this each time but only care about the last value here 

        // All of the hunter applications here will be for the same bounty post so can just use the 
        // postData from one of the applications get the original post info in the for loop
        
        const promises = openBountyIds?.map( async (openBountyId: string) => {
            const postData = await axios.get(`https://arweave.net/${openBountyId}`);
            
            const postId = postData?.config?.url?.split("https://arweave.net/")[1];
            postDataArr.push(postData);
            const bountyIdentifierInput = ethers.utils.solidityKeccak256([ "string", "address", "address" ], [ postData.data.postId, address, postData.data.hunterAddress ]);
            // setBountyIdentifier(bountyIdentifierInput);
            // bountyProgress();

            const progress = await escrowContract.progress(bountyIdentifierInput);
            
            // if ( isBountyProgressSuccess && bountyProgressData! as unknown as number === 1 ) { // Case 4: Submitted
            if (progress === 1) {
                submittedBountiesApps.push(
                    <Application key={postId} 
                        person={postData.data.hunterAddress}
                        experience={postData.data.experience}
                        contactInfo={postData.data.contact}
                        arweaveHash={openBountyId}
                        appLinks={postData.data.appLinks}
                        appStatus={"submitted"}
                        postId={postData.data.postId}
                        workLinks={postData.data.workLinks}
                        postLinks={postData.data.postLinks}
                    />
                );
            }
        });

        if (promises) {
            await Promise.all(promises); // Wait for these promises to resolve before setting the state variables
        }

        setSubmittedBountyPosts(submittedBountiesApps);
        setThisPostData(postDataArr);
    };

    React.useEffect(() => {
        if (!loading && bountyIds?.length > 0) {
            getSubmittedPosts(bountyIds);
        }
    }, [loading]);

    if (submittedBountyPosts.length > 0) {
        return (
            <NestedAccordian key={props.postId} 
                postLinks={thisPostData[0].data.postLinks}
                date={thisPostData[0].data.date}
                time={thisPostData[0].data.time}
                description={thisPostData[0].data.description}
                bountyName={thisPostData[0].data.title}
                amount={thisPostData[0].data.amount}
                arweaveHash={thisPostData[0].data.postId} // Arweave Hash of Original Creator Post
                applications={submittedBountyPosts}
            />
        );
    }
    return <></>;

};


// Query to get ids of hunter's submitted work to creator's posts
const GETWORKSUBMITTEDPOSTS = gql`
    query GetWorkSubmittedPosts($postId: String!, $chain: String!) {
        transactions(
            tags: [
                {
                    name: "Content-Type",
                    values: ["application/json"]
                },
                {
                    name: "App-Name",
                    values: ["Cornucopia-test"]
                },
                {
                    name: "Form-Type",
                    values: ["bounty-app-submit"]
                },
                {
                    name: "Post-ID",
                    values: [$postId]
                },
                {
                    name: "Chain",
                    values: [$chain]
                }
            ]
        ) {
            edges {
                node {
                    id
                }
            }
        }
    }
`;

export default SubmittedPosts;