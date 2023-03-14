import * as React from 'react';
import axios from 'axios';
import { BigNumber, ContractInterface, ethers } from 'ethers';
import NestedAccordian from './nestedAccordion';
import Application from './application';
import escrowABI from '../contracts/out/Escrow.sol/Escrow.json'; // add in actual path later
import { useAccount, useContract, useSigner, useNetwork, useProvider } from 'wagmi';
import erc20ABI from '../contracts/out/ERC20.sol/ERC20.json';
import wethABI from '../WETH9.json';
import daiABI from '../DAI.json';
import usdcABI from '../USDC.json';
import useSWR from 'swr';
import { gqlFetcher } from '../swrFetchers';
import { gql } from 'graphql-request';
import contractAddresses from '../contractAddresses.json';

type Props = {
    postId: string;
    setSubmittedMap: (postId: string) => void;
    incrementSubmittedHits: () => void;
    stage: number;
    smallScreen: boolean;
};

const SubmittedPosts: React.FC<Props> = ({ postId, setSubmittedMap, incrementSubmittedHits, stage, smallScreen, })  => {
    const { address, isConnected } = useAccount();

    const { data: signer, isError, isLoading } = useSigner();
    const { chain } = useNetwork();
    const zeroAddress = '0x0000000000000000000000000000000000000000';
    const network = chain?.network! ? chain?.network! : 'goerli';
    let addresses = contractAddresses.mainnet;
    if (network === 'goerli') {
        addresses = contractAddresses.goerli;
    }

    // Escrow Contract Config
    const contractConfig = {
        addressOrName: addresses.escrow, 
        contractInterface: escrowABI['abi'], 
    };

    // WETH Contract Config (For UMA Bonds)
    const wethContractConfig = {
        addressOrName: addresses.weth, 
        contractInterface: wethABI as ContractInterface, 
    };

    // DAI Contract Config (For UMA Bonds)
    const daiContractConfig = {
        addressOrName: addresses.dai, 
        contractInterface: daiABI as ContractInterface, 
    };

    // USDC Contract Config (For UMA Bonds)
    const usdcContractConfig = {
        addressOrName: addresses.usdc, 
        contractInterface: usdcABI as ContractInterface, 
    };
    
    const escrowAddress = addresses.escrow; 

    const provider = useProvider();
    const escrowContract = useContract({...contractConfig, signerOrProvider: provider, });
    const wethContract = useContract({...wethContractConfig, signerOrProvider: provider, });
    const daiContract = useContract({...daiContractConfig, signerOrProvider: provider, });
    const usdcContract = useContract({...usdcContractConfig, signerOrProvider: provider, });

    const [submittedBountyPosts, setSubmittedBountyPosts] = React.useState(Array<JSX.Element>);
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

    const getSubmittedPosts = React.useCallback(async (openBountyIds: Array<string>) => {

        let submittedBountiesApps: Array<JSX.Element> = [];

        let postDataArr: Array<any> = []; // add postData to this each time but only care about the last value here 

        // All of the hunter applications here will be for the same bounty post so can just use the 
        // postData from one of the applications get the original post info in the for loop
        
        const promises = openBountyIds?.map( async (openBountyId: string) => {
            const postData = await axios.get(`https://arweave.net/${openBountyId}`);
            
            const postId = postData?.config?.url?.split("https://arweave.net/")[1];
            const bountyIdentifierInput = ethers.utils.solidityKeccak256([ "string", "address", "address" ], [ postData.data.postId, address, postData.data.hunterAddress ]);
            let progress;
            try {
                progress = await escrowContract.progress(bountyIdentifierInput);
            } catch (e) {
                console.log('Submitted posts progress fetch error', e);
                return Promise.resolve([]);
            } 
            // const progress = await escrowContract.progress(bountyIdentifierInput);

            // Allowance Data
            let allowance = BigNumber.from(0);

            if (postData.data.tokenAddress !== zeroAddress && postData.data.tokenAddress) {
                const erc20Contract = new ethers.Contract(postData.data.tokenAddress, erc20ABI['abi'], provider!);
                try { 
                    allowance = await erc20Contract.allowance(address, escrowAddress); 
                } catch (e) {
                    console.log('Submitted posts allowance fetch error', e);
                }
            }

            let wethAllowance;
            try {
                wethAllowance = await wethContract.allowance(address, escrowAddress);
            } catch (e) {
                console.log('Submitted posts WETH allowance fetch error', e);
                return Promise.resolve([]);
            }
            let daiAllowance;
            try {
                daiAllowance = await daiContract.allowance(address, escrowAddress);
            } catch (e) {
                console.log('Submitted posts DAI allowance fetch error', e);
                return Promise.resolve([]);
            }
            let usdcAllowance;
            try {
                usdcAllowance = await usdcContract.allowance(address, escrowAddress);
            } catch (e) {
                console.log('Submitted posts USDC allowance fetch error', e);
                return Promise.resolve([]);
            }
            // const wethAllowance = await wethContract.allowance(address, escrowAddress);

            return Promise.resolve([
                progress,
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
                    daiAllowance={daiAllowance}
                    usdcAllowance={usdcAllowance}
                />,
                postData
            ]);
        });

        if (promises) {
            await Promise.all(promises).then(results => {
                results.forEach((result) => {
                    if (result[0] === 1) {
                        submittedBountiesApps.push(result[1]) ;
                    }
                    postDataArr.push(result[2]);
                });
                setSubmittedBountyPosts(submittedBountiesApps);
                setThisPostData(postDataArr);
            });
        }
    }, [address, provider, wethContract, daiContract, usdcContract, escrowContract, escrowAddress]);

    React.useEffect(() => {
        if (bountyIds && bountyIds.length > 0 && !isValidating) {
            getSubmittedPosts(bountyIds);
        }
    }, [bountyIds, isValidating, getSubmittedPosts]);

    if (stage !== 4 && !smallScreen) {
        return <></>;
    }

    if (submittedBountyPosts.length > 0) {
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

export default SubmittedPosts;