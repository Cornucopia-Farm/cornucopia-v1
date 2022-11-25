import * as React from 'react';
import { useQuery, gql } from '@apollo/client';
import axios from 'axios';
import { BigNumber, ContractInterface, ethers } from 'ethers';
import NestedAccordian from './nestedAccordion';
import Application from './application';
import escrowABI from '../cornucopia-contracts/out/Escrow.sol/Escrow.json'; // add in actual path later
import { useAccount, useContract, useSigner, useNetwork } from 'wagmi';
import erc20ABI from '../cornucopia-contracts/out/ERC20.sol/ERC20.json';
import wethABI from '../WETH9.json';

type Props = {
    postId: string;
    setSubmittedMap: (postId: string) => void;
};

// Escrow Contract Config
const contractConfig = {
    addressOrName: process.env.NEXT_PUBLIC_ESCROW_ADDRESS!, // contract address
    contractInterface: escrowABI['abi'], // contract abi in json or JS format
};

// WETH Contract Config (For UMA Bonds)
const wethContractConfig = {
    addressOrName: process.env.NEXT_PUBLIC_WETH_ADDRESS!, // contract address
    contractInterface: wethABI as ContractInterface, // contract abi in json or JS format
};

// // WETH Contract ERC-20 Config
// const wethERC20ContractConfig = {
//     addressOrName: process.env.NEXT_PUBLIC_WETH_ADDRESS!, // contract address
//     contractInterface: erc20ABI['abi'], // contract abi in json or JS format
// };

const SubmittedPosts: React.FC<Props> = props => {

    // Wagmi address/contract info
    const { address, isConnected } = useAccount();

    const { data: signer, isError, isLoading } = useSigner();
    const { chain } = useNetwork();
    const zeroAddress = '0x0000000000000000000000000000000000000000';
    const escrowAddress = process.env.NEXT_PUBLIC_ESCROW_ADDRESS!;

    const escrowContract = useContract({...contractConfig, signerOrProvider: signer, });
    const wethContract = useContract({...wethContractConfig, signerOrProvider: signer, });
    // const wethContract20 = useContract({...wethERC20ContractConfig, signerOrProvider: signer, });

    const [submittedBountyPosts, setSubmittedBountyPosts] = React.useState(Array<JSX.Element>);
    const [thisPostData, setThisPostData] = React.useState(Array<any>);
    
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

            // Allowance Data
            let allowance = BigNumber.from(0);

            if (postData.data.tokenAddress !== zeroAddress && postData.data.tokenAddress) {
                const erc20Contract = new ethers.Contract(postData.data.tokenAddress, erc20ABI['abi'], signer!);
                allowance = await erc20Contract.allowance(address, escrowAddress);
            }

            const wethAllowance = await wethContract.allowance(address, escrowAddress);

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
                        tokenAddress={postData.data.tokenAddress}
                        amount={postData.data.amount}
                        tokenDecimals={postData.data.tokenDecimals}
                        allowance={allowance}
                        wethAllowance={wethAllowance}
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
                startDate={thisPostData[0].data.startDate}
                endDate={thisPostData[0].data.endDate}
                description={thisPostData[0].data.description}
                bountyName={thisPostData[0].data.title}
                amount={thisPostData[0].data.amount}
                arweaveHash={thisPostData[0].data.postId} // Arweave Hash of Original Creator Post
                tokenSymbol={thisPostData[0].data.tokenSymbol}
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

export default SubmittedPosts;