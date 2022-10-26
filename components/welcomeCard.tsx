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
    isConnected: boolean;
};

const WelcomeCard: React.FC<Props> = props => {
    const [connectInfo, setConnectInfo] = React.useState(!props.isConnected);
    
    return (
        <Dialog open={connectInfo} onClose={() => setConnectInfo(false)}>
            <DialogTitle className={styles.formHeader}>Welcome to Cornucopia!</DialogTitle>
            <DialogContent className={styles.cardBackground}>
                <DialogContentText className={styles.dialogBody}>
                Cornucopia is a permissionless bounty protocol where projects/DAOs can post bounties for freelancers to apply to. Once the bounty creator 
                accepts the application, the bounty amount will be escrowed in the Cornucopia smart contract. After a freelancer submits their work, the 
                creator can then choose to pay freelancer, sending the escrowed funds to the freelancer, or dispute the bounty. A creator might dispute the bounty
                if they think that the freelancer's submitted work doesn't match the bounty description. 
                <br />
                <br />
                The freelancer then has 1 week to respond to the dispute: they can 
                either dispute the creator's dispute or leave it and loose any chance of recuperating some of the bounty amount. If they choose to dispute, then the dispute 
                is escalated to UMA token holders (using <Link target="_blank" rel="noopener" href="https://umaproject.org/products/optimistic-oracle">UMAs Optimistic Oracle</Link>) who then vote whether they think the freelancer did the work, did not do the work, or unclear whether the freelancer did the work.
                In the first case, the freelancer gets paid the bounty amount plus half the bond the creator put up to dispute the work. In the second case, the creator gets their 
                escrowed funds back plus half the bond the freelancer put up to dispute the creator's dispute. In the third case, the freelancer gets paid half the bounty amount and 
                half the bond the creator put up to dispute the work while the creator gets half the bount amount back. 
                <br />
                <br />
                Connect your wallet and select your chain of choice to view and apply for open bounties and create bounties of your own!  
                </DialogContentText>
            </DialogContent>
            <DialogActions className={styles.formHeader}>
                    <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(233, 233, 198)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px' }} onClick={() => setConnectInfo(false)}>Got it!</Button>
            </DialogActions>
        </Dialog>
    );
};

export default WelcomeCard;