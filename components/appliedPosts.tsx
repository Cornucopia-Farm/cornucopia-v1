import * as React from 'react';
// import { useQuery, gql } from '@apollo/client';
import axios from 'axios';
import NestedAccordian from './nestedAccordion';
import Application from './application';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import escrowABI from '../cornucopia-contracts/out/Escrow.sol/Escrow.json'; // add in actual path later
import { useAccount, useConnect, useEnsName, useContractWrite, useWaitForTransaction, useContractRead, useBlockNumber, useContract, usePrepareContractWrite, useContractEvent, useSigner, useNetwork } from 'wagmi';
import { BigNumber, ethers } from 'ethers';
import { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import erc20ABI from '../cornucopia-contracts/out/ERC20.sol/ERC20.json';
import useSWR from 'swr';
import gqlFetcher from '../swrFetchers';
import { gql } from 'graphql-request';

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

const AppliedPosts: React.FC<Props> = props => {
 
    const { address, isConnected } = useAccount();
    const { data: signer, isError, isLoading } = useSigner();
    const { chain } = useNetwork();
    const zeroAddress = '0x0000000000000000000000000000000000000000';
    const escrowAddress = process.env.NEXT_PUBLIC_ESCROW_ADDRESS!;

    const escrowContract = useContract({...contractConfig, signerOrProvider: signer,});

    const [appliedBountyPosts, setAppliedBountyPosts] = React.useState(Array<JSX.Element>);
    const [thisPostData, setThisPostData] = React.useState(Array<any>);

    // Fetch Data
    // const { data, loading, error, startPolling } = useQuery(GETAPPLIEDTOPOSTS, { variables: { postId: props.postId, chain: chain?.network! }, });
    // startPolling(1000);

    const { data, error } = useSWR([GETAPPLIEDTOPOSTS, { postId: props.postId, chain: chain?.network! },], gqlFetcher);

    let loading = false;
    
    if (!data) {
        loading = true;
    }
    
    if (error) {
        console.error(error);
    }
    
    const bountyIds = data?.transactions.edges.map((edge: any) => edge.node.id);
    
    if (!loading && bountyIds?.length > 0) {
        props.setAppliedMap(props.postId);
    }

    const getAppliedPosts = async (openBountyIds: Array<string>, existsSubmitted: Promise<Map<string, boolean>>) => {

        let appliedToBountiesApps: Array<JSX.Element> = [];

        let postDataArr: Array<any> = []; // add postData to this each time but only care about the last value here 

        // All of the hunter applications here will be for the same bounty post so can just use the 
        // postData from one of the applications get the original post info in the for loop
        
        const promises = openBountyIds?.map( async (openBountyId: string) => {
            const postData = await axios.get(`https://arweave.net/${openBountyId}`);
            const postId = postData?.config?.url?.split("https://arweave.net/")[1];
            // this might need to be changed back to postData.data.postId
            if ( (await existsSubmitted).has(postId!) ) { // should be postId b/c same bounty could have multiple hunters apply to it and have multiple applications?
                return; 
            }
            postDataArr.push(postData);
            const bountyIdentifierInput = ethers.utils.solidityKeccak256([ "string", "address", "address" ], [ postData.data.postId, address, postData.data.hunterAddress ]);
            // setBountyIdentifier(bountyIdentifierInput);
            // bountyProgress(); // keep this in props bc multiple functions need to update progress? but with different params hmm simplier to have it per component I think b/c unique combo
    
            // Filter events
            const filter = escrowContract.filters.Escrowed(address, postData.data.hunterAddress, postData.data.postId);
            const isEscrowed = await escrowContract.queryFilter(filter);

            const progress = await escrowContract.progress(bountyIdentifierInput);

            // Allowance Data
            let allowance = BigNumber.from(0);

            if (postData.data.tokenAddress !== zeroAddress && postData.data.tokenAddress) {
                const erc20Contract = new ethers.Contract(postData.data.tokenAddress, erc20ABI['abi'], signer!);
                try { 
                    allowance = await erc20Contract.allowance(address, escrowAddress); 
                } catch (e) {
                    console.log('allowance fetch error', e);
                }    
            }

            const startDate = dayjs(postData.data.startDate);
            const endDate = dayjs(postData.data.endDate);
            const expirationTime = endDate.diff(startDate, 'second');
                        
            // Case 2: Applied To
            // if ( isBountyProgressSuccess && bountyProgressData! as unknown as number === 0 && isEscrowed.length === 0 ) {
            if (progress === 0 && isEscrowed.length === 0) {
                appliedToBountiesApps.push(
                    <Application key={postId} 
                        person={postData.data.hunterAddress}
                        experience={postData.data.experience}
                        contactInfo={postData.data.contact}
                        arweaveHash={openBountyId}
                        appLinks={postData.data.appLinks}
                        appStatus={"applied"}
                        postId={postData.data.postId}
                        amount={postData.data.amount}
                        tokenAddress={postData.data.tokenAddress}
                        tokenDecimals={postData.data.tokenDecimals}
                        allowance={allowance}
                        expirationTime={expirationTime}
                    />
                );
            } 
        });

        await Promise.all(promises); // Wait for these promises to resolve before setting the state variables

        setAppliedBountyPosts(appliedToBountiesApps);
        setThisPostData(postDataArr);
    };

    React.useEffect(() => {
        if (!loading && bountyIds?.length > 0) {
            getAppliedPosts(bountyIds, props.existsSubmitted);
        }
    }, [loading]);

    if (appliedBountyPosts.length > 0) {
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
                applications={appliedBountyPosts} 
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

export default AppliedPosts;