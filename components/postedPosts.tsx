import * as React from 'react';
import axios from 'axios';
import NestedAccordian from './nestedAccordion';

type Props = {
    postId: string;
    existsApplied: Map<string, boolean>;
    existsSubmitted: Map<string, boolean>;
    isValidating: boolean;
    stage: number;
    smallScreen: boolean;
};

const PostedPosts: React.FC<Props> = props => {
    const [postedPosts, setPostedPosts] = React.useState(Array<JSX.Element>);

    const getPostedPosts = React.useCallback(async (openBountyId: string, existsApplied: Map<string, boolean>, existsSubmitted: Map<string, boolean>) => {
        let postedBounties: Array<JSX.Element> = [];

        const postData = await axios.get(`https://arweave.net/${openBountyId}`);
        const postId = postData?.config?.url?.split("https://arweave.net/")[1];

        if (existsSubmitted.has(postId!) || existsApplied.has(postId!)) {
            return Promise.resolve([]); 
        }

        postedBounties.push(
            <NestedAccordian key={postId}
                postLinks={postData.data.postLinks}
                startDate={postData.data.startDate}
                endDate={postData.data.endDate}
                description={postData.data.description}
                bountyName={postData.data.title}
                amount={postData.data.amount}
                arweaveHash={openBountyId}
                tokenSymbol={postData.data.tokenSymbol}
            />
        );

        setPostedPosts(postedBounties);
    }, []);

    React.useEffect(() => {
        if (props.postId && props.postId.length > 0 && !props.isValidating) {
            getPostedPosts(props.postId, props.existsApplied, props.existsSubmitted);
        }
    }, [props.isValidating, props.postId, getPostedPosts, props.existsApplied, props.existsSubmitted]);

    if (props.stage !== 1 && !props.smallScreen) {
        return <></>;
    }

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