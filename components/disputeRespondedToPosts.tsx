import * as React from 'react';
// import { useQuery, gql } from '@apollo/client';
import axios from 'axios';
import { ethers } from 'ethers';
import NestedAccordian from './nestedAccordion';
import Application from './application';
import escrowABI from '../cornucopia-contracts/out/Escrow.sol/Escrow.json'; // add in actual path later
import umaABI from '../cornucopia-contracts/out/SkinnyOptimisticOracle.sol/SkinnyOptimisticOracle.json';
import { useAccount, useConnect, useEnsName, useContractWrite, useWaitForTransaction, useContractRead, useBlockNumber, useContract, usePrepareContractWrite, useContractEvent, useSigner, useProvider, ProviderRpcError, useNetwork } from 'wagmi';
import { Request, getUMAEventData } from '../getUMAEventData';
import useSWR from 'swr';
import gqlFetcher from '../swrFetchers';
import { gql } from 'graphql-request';

type Props = {
    postId: string;
    setSubmittedMap: (postId: string) => void;
    incrementSubmittedHits: () => void;
};

// Escrow Contract Config
const contractConfig = {
    addressOrName: process.env.NEXT_PUBLIC_ESCROW_ADDRESS!, // contract address
    contractInterface: escrowABI['abi'], // contract abi in json or JS format
};

// UMA Skinny OO Contract Config
const umaContractConfig = {
    addressOrName: process.env.NEXT_PUBLIC_OO_ADDRESS!, // contract address for OO not skinny OO so need to change
    contractInterface: umaABI['abi'],
};

const defaultIdentifier = ethers.utils.solidityKeccak256([ "string", "address", "address" ], [ "default", "0x", "0x" ]);

const DisputeRespondedToPosts: React.FC<Props> = props => {

    // Wagmi address/contract info
    const { address, isConnected } = useAccount();
    const { data: signer, isError, isLoading } = useSigner();
    const provider = useProvider();
    const { chain } = useNetwork();

    const escrowContract = useContract({...contractConfig, signerOrProvider: signer,});
    const umaContract = useContract({...umaContractConfig, signerOrProvider: signer, });
    const escrowAddress = process.env.NEXT_PUBLIC_ESCROW_ADDRESS!;
    const identifier = "0x5945535f4f525f4e4f5f51554552590000000000000000000000000000000000";

    const [disputeRespondedToBountyPosts, setDisputeRespondedToBountyPosts] = React.useState(Array<JSX.Element>);
    const [thisPostData, setThisPostData] = React.useState(Array<any>);

    // const [bountyIdentifier, setBountyIdentifier] = React.useState(defaultIdentifier);


    // const { data: bountyProgressData, error: bountyProgressError, isLoading: isBountyProgressLoading, isSuccess: isBountyProgressSuccess, refetch: bountyProgress } = useContractRead({...contractConfig, functionName: 'progress', args: [bountyIdentifier], enabled: false, }); // watch causing error not sure why rn

    // const { data, loading, error, startPolling } = useQuery(GETWORKSUBMITTEDPOSTS, { variables: { postId: props.postId, chain: chain?.network! }, });
    // startPolling(1000);

    const { data, error, isValidating } = useSWR([GETWORKSUBMITTEDPOSTS, { postId: props.postId, chain: chain?.network! },], gqlFetcher);
    
    if (error) {
        console.error(error);
    }
    
    const bountyIds = React.useMemo(() => {
        return data?.transactions?.edges.map((edge: any) => edge.node.id);
    }, [data?.transactions?.edges]);

    React.useEffect(() => {
        if (!isValidating && bountyIds?.length > 0) {
            props.setSubmittedMap(props.postId);
        }
        props.incrementSubmittedHits(); // IS THIS RIGHT PLACE TO DO THIS?
    }, [isValidating, bountyIds?.length, props.setSubmittedMap, props.postId]);

    const getDisputeRespondedToPosts = React.useCallback(async (openBountyIds: Array<string>) => {

        let disputeRespondedToPostsBountiesApps: Array<JSX.Element> = [];

        let postDataArr: Array<any> = []; // add postData to this each time but only care about the last value here 

        // All of the hunter applications here will be for the same bounty post so can just use the 
        // postData from one of the applications get the original post info in the for loop
        
        const promises = openBountyIds?.map( async (openBountyId: string) => {
            const postData = await axios.get(`https://arweave.net/${openBountyId}`);
            
            const postId = postData?.config?.url?.split("https://arweave.net/")[1];
            // postDataArr.push(postData);
            const bountyIdentifierInput = ethers.utils.solidityKeccak256([ "string", "address", "address" ], [ postData.data.postId, address, postData.data.hunterAddress ]);
            const progress = await escrowContract.progress(bountyIdentifierInput);

            if (progress != 3) {
                return Promise.resolve([]); // Prevent getUmaEventData from being called if not correct state of bounty
            }

            // Get UMA data
            const umaEventData = await getUMAEventData(umaContract, escrowContract, provider, 'dispute', address!, postData.data.hunterAddress, postData.data.postId);
            
            // Check status of dispute
            const disputeStatus = await umaContract.getState(escrowAddress, identifier, umaEventData.timestamp, umaEventData.ancillaryData, umaEventData.request);
            // if (progress === 3) { // Case 6: Waiting for dispute to be resolved
            //     disputeRespondedToPostsBountiesApps.push(
            //         <Application key={postId} 
            //             person={postData.data.hunterAddress}
            //             experience={postData.data.experience}
            //             contactInfo={postData.data.contact}
            //             arweaveHash={openBountyId}
            //             appLinks={postData.data.appLinks}
            //             workLinks={postData.data.workLinks}
            //             appStatus={"settle"}
            //             postId={postData.data.postId}
            //             timestamp={umaEventData.timestamp}
            //             ancillaryData={umaEventData.ancillaryData}
            //             request={umaEventData.request}
            //             tokenAddress={postData.data.tokenAddress}
            //         />
            //     );
            // }

            return Promise.resolve([
                progress,
                <Application key={postId} 
                    person={postData.data.hunterAddress}
                    experience={postData.data.experience}
                    contactInfo={postData.data.contact}
                    arweaveHash={openBountyId}
                    appLinks={postData.data.appLinks}
                    workLinks={postData.data.workLinks}
                    appStatus={"settle"}
                    postId={postData.data.postId}
                    timestamp={umaEventData.timestamp}
                    ancillaryData={umaEventData.ancillaryData}
                    request={umaEventData.request}
                    tokenAddress={postData.data.tokenAddress}
                    disputeStatus={disputeStatus}
                />,
                postData
            ]);
        });

        if (promises) {
            await Promise.all(promises).then(results => {
                results.forEach((result) => {
                    if (result[0] === 3) {
                        disputeRespondedToPostsBountiesApps.push(result[1]) ;
                    }
                    postDataArr.push(result[2]);
                });
                setDisputeRespondedToBountyPosts(disputeRespondedToPostsBountiesApps);
                setThisPostData(postDataArr);
            });
        }
    }, []);

    React.useEffect(() => {
        if (bountyIds && bountyIds.length > 0 && !isValidating) {
            getDisputeRespondedToPosts(bountyIds);
        }
    }, [bountyIds, isValidating, getDisputeRespondedToPosts]);

    if (disputeRespondedToBountyPosts.length > 0) {
        return (
            <NestedAccordian key={props.postId} 
                postLinks={thisPostData[0].data.postLinks}
                startDate={thisPostData[0].data.startDate}
                endDate={thisPostData[0].data.endDate}
                description={thisPostData[0].data.description}
                bountyName={thisPostData[0].data.title}
                amount={thisPostData[0].data.amount}
                arweaveHash={thisPostData[0].data.postId} // Arweave Hash of Original Creator Post
                tokenSymbol={thisPostData[0].data.tokenSymbol}
                applications={disputeRespondedToBountyPosts}
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
                    values: ["Cornucopia-test2"]
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

export default DisputeRespondedToPosts;