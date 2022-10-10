import type { NextPage } from 'next';
import Head from 'next/head';
import Image from 'next/image';
import Button from '@mui/material/Button';
import React, { ReactElement, useEffect } from 'react';
// import Table from '../components/table';
import Box from '@mui/material/Box';
import Form from '../components/form';
import BasicAccordian from '../components/basicAccordion';
import Card from '@mui/material/Card';
import { useQuery, gql } from '@apollo/client';
import ClientOnly from '../components/clientOnly';
import axios from 'axios';
import { useAccount, useEnsName, useProvider, useSigner, useNetwork } from 'wagmi';
import { CompressOutlined } from '@mui/icons-material';
import { TailSpin } from 'react-loader-spinner';
import { alchemyProvider } from 'wagmi/providers/alchemy';
import { publicProvider } from 'wagmi/providers/public';
import styles from '../styles/Home.module.css';

type ArData = {
    address: string;
    title: string;
    description: string;
    amount: number; 
    date: string;
    time: string; 
    postLinks: Array<string>;
    appLinks: Array<string>;
    experience: string;
    contact: string;
};

const OpenBounties: NextPage = () => {
    const { address } = useAccount();
    const { data: ensName } = useEnsName({ address, enabled: false, });
    const { chain } = useNetwork();

    const [openBountyPosts, setOpenBountyPosts] = React.useState(Array<JSX.Element>);

    const { data, loading, error, startPolling } = useQuery(OPENBOUNTIES, { variables: { chain: chain?.network! ? chain?.network! : 'ethereum' }, }); // Set default chain to ethereum if nothing connected
    startPolling(10000);

    if (error) {
        console.error(error); // add snackbar error msg;
    }

    const postIds = data?.transactions.edges.map((edge: any) => edge.node.id);
    
    const getPosts = async (openBountyIds?: Array<string>) => {
        let bountyPosts: Array<JSX.Element> = [];

        const promises = openBountyIds?.map( async (openBountyId: string) => {

            const postData = await axios.get(`https://arweave.net/${openBountyId}`);
            const postId = postData?.config?.url?.split("https://arweave.net/")[1]; // This is the postId of the creator's post

            bountyPosts.push(
                <BasicAccordian key={postId}  
                    company={postData.data.creatorAddress}
                    postLinks={postData.data.postLinks}
                    date={postData.data.date}
                    time={postData.data.time}
                    description={postData.data.description}
                    bountyName={postData.data.title}
                    amount={postData.data.amount}
                    arweaveHash={openBountyId}
                    disputes={false} 
                >
                    <Form 
                        creatorAddress={postData.data.creatorAddress}
                        hunterAddress={address!}
                        postId={postId}
                        postLinks={postData.data.postLinks}
                        date={postData.data.date}
                        time={postData.data.time}
                        description={postData.data.description}
                        title={postData.data.title}
                        amount={postData.data.amount}
                        formName={"Apply"}
                        summary={"Please fill out this form to apply to this bounty!"}  
                        formButtons={["Cancel", "Apply"]}
                        formType={"applyBounty"}
                        tags={[
                            {
                                name: "Content-Type",
                                value: "application/json"
                            },
                            {
                                name: "App-Name",
                                value: "Cornucopia-test"
                            },
                            {
                                name: "Form-Type",
                                value: "bounty-app"
                            },
                            {
                                name: "Hunter-Address",
                                value: address!
                            },
                            {
                                name: "Post-ID",
                                value: postId // postID of the bounty created by the creator
                            },
                            {
                                name: "Chain",
                                value: chain?.network!
                            }
                        ]}
                    />
                </BasicAccordian>
            ); 
        });

        if (promises) {
            await Promise.all(promises); // Wait for these promises to resolve before setting the state variables
        }
        // change foreach to map which returns an array of promises then await for this array of promises to resolve using promise.all before the code continues

        setOpenBountyPosts(bountyPosts);
    };

    useEffect(() => {
        if (!loading) {
            getPosts(postIds);
        } 
    }, [loading]);
    
    if (!loading && openBountyPosts.length > 0) {
        return (
            <div className={styles.background}>
                <Head>
                    <title>Open Bounties</title>
                    <meta name="description" content="First Farm" />
                    <link rel="icon" href="/favicon.ico" />
                </Head>

                <main>
                <Box sx={{ display: 'flex', flexDirection: 'column', paddingLeft: '160px', paddingRight: '160px', color: 'rgba(6, 72, 41, 0.85)', height: '108px + 1vh'}}> 
                    <h2>Open Bounties</h2>
                    <Card sx={{ backgroundColor: 'rgba(6, 72, 41, 0.05)', borderRadius: '12px', paddingTop: '12px', paddingLeft: '12px', paddingRight: '12px', paddingBottom: '12px' }}> 
                        <ClientOnly>
                            {openBountyPosts}
                        </ClientOnly>
                    </Card>
                </Box>
                </main>
            </div>
        );
    }
    return (
        <Box sx={{ marginLeft: 'auto', marginRight: 'auto' }}> 
            <TailSpin color={"rgb(151, 208, 252)"}/>
        </Box>
    );
};

const OPENBOUNTIES = gql`
    query OpenBounties($chain: String!) {
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
                    values: ["bounty-post"]
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

export default OpenBounties;

