import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';
import styles from '../styles/Home.module.css';
import Link from 'next/link';

type Props = {
    open: boolean;
    setOpen: (value: React.SetStateAction<boolean>) => void;
};

const CreateBountiesInfo: React.FC<Props> = props => {
    return (
        <Dialog open={props.open} onClose={() => props.setOpen(false)} PaperProps={{ style: { backgroundColor: "transparent", boxShadow: "none" }, }}>
            <DialogTitle className={styles.formHeader}>Bounty Stages</DialogTitle>
            <DialogContent className={styles.cardBackground}>
                <DialogContentText className={styles.dialogBody}>
                Posted: View all the bounties that you've posted but bounty hunters haven't yet applied to.
                <br />
                <br />
                Applied To: View all the bounties that bounty hunters have applied to. Under each bounty name you can find the hunters' applications.
                To accept their application, click Escrow to escrow the bounty amount into the Cornucopia contract. 
                <br />
                <br />
                In Progress: View all the bounties that bounty hunters are actively working on. Once they submit their work, the bounty 
                will move to the Submitted stage. 
                <br />
                <br />
                Submitted: View all bounties bounty hunters have submitted. If you're satisfied with their work, then you can 
                click Pay to payout the bounty amount. Otherwise, click Dispute to start a dispute by putting up a bond in UMA's 
                dispute resolution system. The bounty hunter has 1 week to respond to your dispute. If they don't respond then you get your escrowed funds back, otherwise the dispute gets 
                escalated to UMA token holders (using <Link target="_blank" rel="noopener" href="https://umaproject.org/products/optimistic-oracle">UMAs Optimistic Oracle</Link>) 
                who will then vote on whether they did the work, didn't do the work, or if it's unclear if the hunter did the work according to your spec. 
                <br />
                <br />
                Dispute Initiated: View all bounties where you have disputedd the bounty hunter's submitted work but they have not yet
                responded.
                <br />
                <br />
                Dispute Responded To: View all bounties where the bounty hunter responded to your dispute and are now waiting for the dispute to be resolved. 
                Once resolved, the bounty will move to the Finished stage. 
                <br />
                <br />
                Finished: View all finished bounties, including those payed out normally or those that were disputed and are 
                now resolved by UMA.
                </DialogContentText>
            </DialogContent>
            <DialogActions className={styles.formFooter}>
                    <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(233, 233, 198)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={() => props.setOpen(false)}>Got it!</Button>
            </DialogActions>
        </Dialog>
    );
};

export default CreateBountiesInfo;