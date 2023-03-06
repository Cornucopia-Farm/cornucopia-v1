import * as React from 'react';
// import { useQuery, gql } from '@apollo/client';
import axios from 'axios';
import { ethers } from 'ethers';
import NestedAccordian from './nestedAccordion';
import Application from './application';
import escrowABI from '../contracts/out/Escrow.sol/Escrow.json'; // add in actual path later
import umaABI from '../contracts/out/SkinnyOptimisticOracle.sol/SkinnyOptimisticOracle.json';
import { useAccount, useConnect, useEnsName, useContractWrite, useWaitForTransaction, useContractRead, useBlockNumber, useContract, usePrepareContractWrite, useContractEvent, useSigner, useProvider, ProviderRpcError, useNetwork } from 'wagmi';
import { Request, getUMAEventData } from '../getUMAEventData';
import useSWR from 'swr';
import gqlFetcher from '../swrFetchers';
import { gql } from 'graphql-request';
import contractAddresses from '../contractAddresses.json';

type Props = {
    postId: string;
    setSubmittedMap: (postId: string) => void;
    incrementSubmittedHits: () => void;
    stage: number;
    smallScreen: boolean;
};


const DisputeRespondedToPosts: React.FC<Props> = ({ postId, setSubmittedMap, incrementSubmittedHits, stage, smallScreen, }) => {

    // Wagmi address/contract info
    const { address, isConnected } = useAccount();
    const { data: signer, isError, isLoading } = useSigner();
    const provider = useProvider();
    const { chain } = useNetwork();
    const network = chain?.network! ? chain?.network! : 'goerli';
    let addresses: any;
    if (network === 'goerli') {
        addresses = contractAddresses.goerli;
    } else if (network === 'mainnet') {
        addresses = contractAddresses.mainnet;
    }

    // Escrow Contract Config
    const contractConfig = {
        addressOrName: addresses.escrow, // '0x94B9f298982393673d6041Bc9D419A2e1f7e14b4', 
        contractInterface: escrowABI['abi'], // contract abi in json or JS format
    };

    // UMA Skinny OO Contract Config
    const umaContractConfig = {
        addressOrName: addresses.oracle, // '0xeDc52A961B5Ca2AC7B2e0bc36714dB60E5a115Ab', 
        contractInterface: umaABI['abi'],
    };

    const escrowContract = useContract({...contractConfig, signerOrProvider: provider,});
    const umaContract = useContract({...umaContractConfig, signerOrProvider: provider, });
    const escrowAddress = addresses.escrow; // '0x94B9f298982393673d6041Bc9D419A2e1f7e14b4'; 
    const identifier = "0x5945535f4f525f4e4f5f51554552590000000000000000000000000000000000";

    const [disputeRespondedToBountyPosts, setDisputeRespondedToBountyPosts] = React.useState(Array<JSX.Element>);
    const [thisPostData, setThisPostData] = React.useState(Array<any>);

    const { data, error, isValidating } = useSWR([GETWORKSUBMITTEDPOSTS, { postId: postId, chain: chain?.network! },], gqlFetcher);
    
    if (error) {
        console.error(error);
    }

    const loaded = React.useRef(false); 
    
    const bountyIds = React.useMemo(() => {
        return data?.transactions?.edges.map((edge: any) => edge.node.id);
    }, [data?.transactions?.edges]);

    React.useEffect(() => {
        if (!isValidating && bountyIds?.length > 0) {
            setSubmittedMap(postId);
        }
    }, [isValidating, bountyIds?.length, setSubmittedMap, postId]);

    React.useEffect(() => {
        if (!isValidating && !loaded.current) {
            loaded.current = true;
            incrementSubmittedHits();
        }
    }, [isValidating, incrementSubmittedHits]);

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
            let progress;
            try {
                progress = await escrowContract.progress(bountyIdentifierInput);
            } catch (e) {
                console.log('Dispute Responded to posts progress fetch error', e);
                return Promise.resolve([]);
            } 
            // const progress = await escrowContract.progress(bountyIdentifierInput);

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
    }, [address, provider, escrowContract, umaContract, escrowAddress]);

    React.useEffect(() => {
        if (bountyIds && bountyIds.length > 0 && !isValidating) {
            getDisputeRespondedToPosts(bountyIds);
        }
    }, [bountyIds, isValidating, getDisputeRespondedToPosts]);

    if (stage !== 6 && !smallScreen) {
        return <></>;
    }

    if (disputeRespondedToBountyPosts.length > 0) {
        return (
            <NestedAccordian key={postId} 
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
                    values: ["Cornucopia-test5"]
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