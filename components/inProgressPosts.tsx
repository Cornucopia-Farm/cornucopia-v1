import * as React from 'react';
import { useQuery, gql } from '@apollo/client';
import axios from 'axios';
import { ethers } from 'ethers';
import NestedAccordian from './nestedAccordion';
import Application from './application';
import escrowABI from '../cornucopia-contracts/out/Escrow.sol/Escrow.json'; // add in actual path later
import { useAccount, useConnect, useEnsName, useContractWrite, useWaitForTransaction, useContractRead, useBlockNumber, useContract, usePrepareContractWrite, useContractEvent, useSigner, useNetwork } from 'wagmi';


// BUG: TypeError: Cannot read properties of null (reading 'getLogs') when const isEscrowed = await props.escrowContract.queryFilter(filter); likely bc escrowContract hasn't been defined
// data noot showing up either for applied bounties most of the time hmm


type Props = {
    postId: string;
    existsSubmitted: Promise<Map<string, boolean>>;
    setAppliedMap: (postId: string) => void;
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
    const { chain } = useNetwork();

    const escrowContract = useContract({...contractConfig, signerOrProvider: signer,});

    const [inProgressBountyPosts, setInProgressBountyPosts] = React.useState(Array<JSX.Element>);
    const [thisPostData, setThisPostData] = React.useState(Array<any>);
    
    const { data, loading, error, startPolling } = useQuery(GETAPPLIEDTOPOSTS, { variables: { postId: props.postId, chain: chain?.network! }, });
    startPolling(10000);

    if (error) {
        console.error(error);
    }
    
    const bountyIds = data?.transactions.edges.map((edge: any) => edge.node.id);
    
    if (!loading && bountyIds?.length > 0) {
        props.setAppliedMap(props.postId);
    }

    const getInProgressPosts = async (openBountyIds: Array<string>, existsSubmitted: Promise<Map<string, boolean>>) => {

        let inProgressBountiesApps: Array<JSX.Element> = [];

        let postDataArr: Array<any> = []; // add postData to this each time but only care about the last value here 

        // All of the hunter applications here will be for the same bounty post so can just use the 
        // postData from one of the applications get the original post info in the for loop
        
        const promises = openBountyIds?.map( async (openBountyId: string) => {
            const postData = await axios.get(`https://arweave.net/${openBountyId}`);
            
            if ( (await existsSubmitted).has(postData.data.postId) ) {
                return; // Equivalent ot continue in a forEach loop in ts
            }
            const postId = postData?.config?.url?.split("https://arweave.net/")[1];
            postDataArr.push(postData);
    
            // Filter events
            const filter = escrowContract.filters.Escrowed(address, postData.data.hunterAddress, postData.data.postId);
            const isEscrowed = await escrowContract.queryFilter(filter);
            
            if ( isEscrowed.length > 0 ) { // Case 3: In Progress
                inProgressBountiesApps.push(
                    <Application key={postId} 
                        person={postData.data.hunterAddress}
                        experience={postData.data.experience}
                        contactInfo={postData.data.contact}
                        arweaveHash={openBountyId}
                        appLinks={postData.data.appLinks}
                    />
                );
            }
        });

        if (promises) {
            await Promise.all(promises); // Wait for these promises to resolve before setting the state variables
        }

        setInProgressBountyPosts(inProgressBountiesApps);
        setThisPostData(postDataArr);
    };

    React.useEffect(() => {
        if (!loading && bountyIds?.length > 0) {
            getInProgressPosts(bountyIds, props.existsSubmitted);
        }
    }, [loading]);

    if (inProgressBountyPosts.length > 0) {
        return (
            <NestedAccordian key={props.postId} 
                postLinks={thisPostData[0].data.postLinks}
                date={thisPostData[0].data.date}
                time={thisPostData[0].data.time}
                description={thisPostData[0].data.description}
                bountyName={thisPostData[0].data.title}
                amount={thisPostData[0].data.amount}
                arweaveHash={thisPostData[0].data.postId} // Arweave Hash of Original Creator Post
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
                    values: ["Cornucopia-test"]
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