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

const MyBountiesInfo: React.FC<Props> = props => {    
    return (
        <Dialog open={props.open} onClose={() => props.setOpen(false)} PaperProps={{ style: { backgroundColor: "transparent", boxShadow: "none" }, }}>
            <DialogTitle className={styles.formHeader}>Bounty Stages</DialogTitle>
            <DialogContent className={styles.cardBackground}>
                <DialogContentText className={styles.dialogBody}>
                Applied: View all the bounties that you applied to on the Open Bounties page. Once the bounty creator accepts your
                application and escrows the bounty amount, the bounty moves to the In Progress stage.
                <br />
                <br />
                In Progress: View all the bounties where a bounty creator accepted your application. To submit your work, click on the 
                Submit button to link and submit your finished work. This will open up your wallet to log the time you've submitted your 
                work in the Cornucopia smart contract.
                <br />
                <br />
                Submitted: View all bounties that you've submitted your work for and are waiting for the bounty creator to payout the bounty 
                amount or dispute the work.
                <br />
                <br />
                Dispute Initiated: View all bounties where the bounty creator has disputed your submitted work. You will have 1 week to 
                respond to the dispute if you so choose. If you respond to the dispute, then you put up a bond and the dispute 
                is escalated to UMA token holders (using <Link target="_blank" rel="noopener" href="https://umaproject.org/products/optimistic-oracle">UMAs Optimistic Oracle</Link>) 
                who will then vote on whether you did the work, didn't do the work, or if it's unclear if you did the work according to the creator's spec. 
                <br />
                <br />
                Dispute Responded To: View all bounties where you responded to the bounty creator's dispute and are now waiting for the dispute to be resolved. 
                Once resolved, the bounty will move to the Finished stage. 
                <br />
                <br />
                Force Payout: View all bounties where you can force the bounty creator to payout the funds to you for your submitted work. Bounties enter this
                stage if the creator hasn't payed you out or disputed your work within 2 weeks of your work submission. 
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

export default MyBountiesInfo;