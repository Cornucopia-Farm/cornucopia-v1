import * as React from 'react';
// import { useQuery, gql } from '@apollo/client';
import axios from 'axios';
import { ethers } from 'ethers';
import NestedAccordian from './nestedAccordion';
import Application from './application';
import escrowABI from '../cornucopia-contracts/out/Escrow.sol/Escrow.json'; // add in actual path later
import { useAccount, useConnect, useEnsName, useContractWrite, useWaitForTransaction, useContractRead, useBlockNumber, useContract, usePrepareContractWrite, useContractEvent, useSigner, useNetwork, useProvider } from 'wagmi';
import useSWR from 'swr';
import gqlFetcher from '../swrFetchers';
import { gql } from 'graphql-request';
import { LocalConvenienceStoreOutlined } from '@mui/icons-material';

// BUG: TypeError: Cannot read properties of null (reading 'getLogs') when const isEscrowed = await props.escrowContract.queryFilter(filter); likely bc escrowContract hasn't been defined
// data noot showing up either for applied bounties most of the time hmm


type Props = {
    postId: string;
    existsSubmitted: Map<string, boolean>;
    setAppliedMap: (postId: string) => void;
    incrementAppliedHits: () => void;
    stage: number;
};

// Escrow Contract Config
const contractConfig = {
    addressOrName: process.env.NEXT_PUBLIC_ESCROW_ADDRESS!, // contract address
    contractInterface: escrowABI['abi'], // contract abi in json or JS format
};

const InProgressPosts: React.FC<Props> = props => {

    // Wagmi address/contract info
    const { address, isConnected } = useAccount();
    const { data: signer, isError, isLoading } = useSigner();
    const provider = useProvider();
    const { chain } = useNetwork();

    const escrowContract = useContract({...contractConfig, signerOrProvider: signer,});

    const [inProgressBountyPosts, setInProgressBountyPosts] = React.useState(Array<JSX.Element>);
    const [thisPostData, setThisPostData] = React.useState(Array<any>);
    

    const { data, error, isValidating } = useSWR([GETAPPLIEDTOPOSTS, { postId: props.postId, chain: chain?.network! },], gqlFetcher);

    if (error) {
        console.error(error);
    }

    const loaded = React.useRef(false); 
    
    const bountyIds = React.useMemo(() => {
        return data?.transactions?.edges.map((edge: any) => edge.node.id);
    }, [data?.transactions?.edges]);
    
   
    React.useEffect(() => {
        if (!isValidating && bountyIds?.length > 0) {
            props.setAppliedMap(props.postId);
        }
    }, [isValidating, bountyIds?.length, props.setAppliedMap, props.postId]);

    React.useEffect(() => {
        if (!isValidating && !loaded.current) {
            loaded.current = true;
            props.incrementAppliedHits();
        }
    }, [isValidating, props.incrementAppliedHits]);

    const getInProgressPosts = React.useCallback(async (openBountyIds: Array<string>, existsSubmitted: Map<string, boolean>) => {

        let inProgressBountiesApps: Array<JSX.Element> = [];

        let postDataArr: Array<any> = []; // add postData to this each time but only care about the last value here 

        // All of the hunter applications here will be for the same bounty post so can just use the 
        // postData from one of the applications get the original post info in the for loop
        
        const promises = openBountyIds?.map( async (openBountyId: string) => {
            const postData = await axios.get(`https://arweave.net/${openBountyId}`);
            console.log('in progress data', postData)
            if ( (existsSubmitted).has(postData.data.postId) ) {
                return Promise.resolve([]); // Equivalent ot continue in a forEach loop in ts
            }
            const postId = postData?.config?.url?.split("https://arweave.net/")[1];
            //postDataArr.push(postData);
    
            // Filter events
            const filter = escrowContract.filters.Escrowed(address, postData.data.hunterAddress, postData.data.postId);
            const isEscrowed = await escrowContract.queryFilter(filter);

            // Expiration
            const bountyIdentifierInput = ethers.utils.solidityKeccak256([ "string", "address", "address" ], [ postData.data.postId, address, postData.data.hunterAddress ]);
            const expirationTime = await escrowContract.expiration(bountyIdentifierInput);
            // todo: get current blocktime and compare it to expirationTime then set creatorRefund
            const currentBlocktime = await provider.getBlock("latest");
            const creatorRefund = expirationTime < currentBlocktime ? true : false;
            /*if ( isEscrowed.length > 0 ) { // Case 3: In Progress
                inProgressBountiesApps.push(
                    <Application key={postId} 
                        person={postData.data.hunterAddress}
                        experience={postData.data.experience}
                        contactInfo={postData.data.contact}
                        arweaveHash={openBountyId}
                        appLinks={postData.data.appLinks}
                    />
                );
            }*/
            return Promise.resolve([
                isEscrowed,  
                <Application key={postId} 
                    person={postData.data.hunterAddress}
                    experience={postData.data.experience}
                    contactInfo={postData.data.contact}
                    arweaveHash={openBountyId}
                    appLinks={postData.data.appLinks}
                    postId={postData.data.postId}
                    tokenAddress={postData.data.tokenAddress}
                    creatorRefund={creatorRefund}
                />, 
                postData
            ]);
        });

        if (promises) {
            await Promise.all(promises).then(results => {
                results.forEach(result => {
                    if (result.length) {
                        if (result[0].length > 0) { // Case 3: In Progress
                            console.log('in progress true')
                            inProgressBountiesApps.push(result[1]);
                        }
                        postDataArr.push(result[2]);
                    }
                });
                setInProgressBountyPosts(inProgressBountiesApps);
                setThisPostData(postDataArr);
            }); // Wait for these promises to resolve before setting the state variables
        }  
    }, [address, escrowContract, provider]);

    React.useEffect(() => {
        if (bountyIds && bountyIds.length > 0 && !isValidating) {
            getInProgressPosts(bountyIds, props.existsSubmitted);
        }
    }, [bountyIds, isValidating, getInProgressPosts, props.existsSubmitted]);

    if (props.stage !== 3) {
        return <></>;
    }

    if (inProgressBountyPosts.length > 0) {
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
                applications={inProgressBountyPosts}
            />
        );
    }
    return <></>;
};


// Query to get ids of hunters' applications to creator's posts
const GETAPPLIEDTOPOSTS = gql`
    query GetAppliedToPosts($postId: String!, $chain: String!) {
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
                    values: ["bounty-app"]
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

export default InProgressPosts;