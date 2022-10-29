import * as React from 'react';
import { useQuery, gql } from '@apollo/client';
import axios from 'axios';
import NestedAccordian from './nestedAccordion';

type Props = {
    postId: string;
    existsApplied: Map<string, boolean>;
    existsSubmitted: Map<string, boolean>;
    loading: boolean;
};

const PostedPosts: React.FC<Props> = props => {

    const [postedPosts, setPostedPosts] = React.useState(Array<JSX.Element>);

    const getPostedPosts = async (openBountyId: string, existsApplied: Map<string, boolean>, existsSubmitted: Map<string, boolean>) => {
        let postedBounties: Array<JSX.Element> = [];

        const promise = async (openBountyId: string, existsApplied: Map<string, boolean>, existsSubmitted: Map<string, boolean>) => {
            const postData = await axios.get(`https://arweave.net/${openBountyId}`);
            const postId = postData?.config?.url?.split("https://arweave.net/")[1];
            
            if (!existsApplied || !existsSubmitted) {
                return;
            }
            if (postId && !(existsApplied).has(postId) && !(existsSubmitted).has(postId)) { // only postId exists here
                postedBounties.push( 
                    <NestedAccordian key={postId}
                        postLinks={postData.data.postLinks}
                        date={postData.data.date}
                        time={postData.data.time}
                        description={postData.data.description}
                        bountyName={postData.data.title}
                        amount={postData.data.amount}
                        arweaveHash={openBountyId}
                        tokenSymbol={postData.data.tokenSymbol}
                    />
                );
            }
        }

        await promise(openBountyId, existsApplied, existsSubmitted); // Wait for this function to resolve

        setPostedPosts(postedBounties);

        // console.log("applied map", existsApplied)
        // console.log("submitted map", existsSubmitted)
        // openBountyIds?.forEach( async (openBountyId: any) => {
        //     const postData = await axios.get(`https://arweave.net/${openBountyId}`);
        //     const postId = postData?.config?.url?.split("https://arweave.net/")[1];
        //     console.log("bounty id",openBountyId)
        //     console.log("data post id", postData.data.postId)
        //     console.log("other postId", postId)
        //     console.log(existsApplied.has("beFU1sD9PPeXWZt6H0dXntLTM6H68wTBpFtnZUGbd5c"))
        //     console.log(existsSubmitted.has("beFU1sD9PPeXWZt6H0dXntLTM6H68wTBpFtnZUGbd5c"))
        //     console.log("applied map", existsApplied)
        //     console.log("submitted map", existsSubmitted)
        //     // if (postId && !existsApplied.has(postData.data.postId!) && !existsSubmitted.has(postData.data.postId!)) { 
        //     if (postId && !existsApplied.has(postId) && !existsSubmitted.has(postId)) { // only postId exists here
        //         postedBounties.push( 
        //             <NestedAccordian key={postId}
        //                 postLinks={postData.data.postLinks}
        //                 date={postData.data.date}
        //                 time={postData.data.time}
        //                 description={postData.data.description}
        //                 bountyName={postData.data.title}
        //                 amount={postData.data.amount}
        //             />
        //         );
        //     }
        // });
        // setPostedPosts(postedBounties);
    };

    React.useEffect(() => {
        if (!props.loading && props.postId?.length > 0) {
            getPostedPosts(props.postId!, props.existsApplied, props.existsSubmitted);
        }
    }, [props.loading]);

    if (postedPosts.length > 0) {
        return (
            <>
                {postedPosts}
            </>
        );
    } 
    return <></>;
};

export default PostedPosts;