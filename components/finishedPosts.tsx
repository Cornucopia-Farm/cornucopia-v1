import * as React from 'react';
// import { useQuery, gql } from '@apollo/client';
import axios from 'axios';
import { ethers } from 'ethers';
import NestedAccordian from './nestedAccordion';
import Application from './application';
import escrowABI from '../contracts/out/Escrow.sol/Escrow.json'; 
import { useAccount, useConnect, useEnsName, useContractWrite, useWaitForTransaction, useContractRead, useBlockNumber, useContract, usePrepareContractWrite, useContractEvent, useSigner, useNetwork, useProvider } from 'wagmi';
import useSWR from 'swr';
import { gqlFetcher } from '../swrFetchers';
import { gql } from 'graphql-request';
import { getEscrowEventData } from '../getEscrowEventData';
import contractAddresses from '../contractAddresses.json';

// TODO: add logic too look at event for finished post to determine who won dispute (if this was an issue), or non dispute 

type Props = {
    postId: string;
    setSubmittedMap: (postId: string) => void;
    incrementSubmittedHits: () => void;
    stage: number;
    smallScreen: boolean;
};

const FinishedPosts: React.FC<Props> = ({ postId, setSubmittedMap, incrementSubmittedHits, stage, smallScreen, }) => {

    // Wagmi address/contract info
    const { address, isConnected } = useAccount();

    const { data: signer, isError, isLoading } = useSigner();
    const { chain } = useNetwork();
    const network = chain?.network! ? chain?.network! : 'goerli';
    let addresses = contractAddresses.mainnet;
    if (network === 'goerli') {
        addresses = contractAddresses.goerli;
    }

    // Escrow Contract Config
    const contractConfig = {
        addressOrName: addresses.escrow, // '0x94B9f298982393673d6041Bc9D419A2e1f7e14b4', 
        contractInterface: escrowABI['abi'], // contract abi in json or JS format
    };

    const provider = useProvider();
    const escrowContract = useContract({...contractConfig, signerOrProvider: provider, });

    const [finishedBountyPosts, setFinishedBountyPosts] = React.useState(Array<JSX.Element>);
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

    const getFinishedPosts = React.useCallback(async (openBountyIds: Array<string>) => {

        let finishedBountiesApps: Array<JSX.Element> = [];

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
                console.log('Finished posts progress fetch error', e);
                return Promise.resolve([]);
            } 
            // const progress = await escrowContract.progress(bountyIdentifierInput);

            const finishedStatus = await getEscrowEventData(escrowContract, 'finished', address!, postData.data.hunterAddress, postData.data.postId);

            // this isn't working need to fix
            // if ( isBountyProgressSuccess && bountyProgressData! as unknown as number === 4 ) { // Case 7: Finished; need to check FundsSent event to see how they were resolved!!
            // if (progress === 4) {
            //     finishedBountiesApps.push(
            //         <Application key={postId} 
            //             person={postData.data.hunterAddress}
            //             experience={postData.data.experience}
            //             contactInfo={postData.data.contact}
            //             arweaveHash={openBountyId}
            //             appLinks={postData.data.appLinks}
            //             workLinks={postData.data.workLinks}
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
                    finishedStatus={finishedStatus}
                />,
                postData
            ]);
        });

        if (promises) {
            await Promise.all(promises).then(results => {
                results.forEach((result) => {
                    if (result[0] === 4) {
                        finishedBountiesApps.push(result[1]) ;
                    }
                    postDataArr.push(result[2]);
                });
                setFinishedBountyPosts(finishedBountiesApps);
                setThisPostData(postDataArr);
            });        
        }
    }, [address, escrowContract]);

    React.useEffect(() => {
        if (bountyIds && bountyIds.length > 0 && !isValidating) {
            getFinishedPosts(bountyIds);
        }
    }, [bountyIds, isValidating, getFinishedPosts]);

    if (stage !== 7 && !smallScreen) {
        return <></>;
    }

    if (finishedBountyPosts.length > 0) {
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
                applications={finishedBountyPosts}
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
                    values: ["Cornucopia-prod1"]
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

export default FinishedPosts;