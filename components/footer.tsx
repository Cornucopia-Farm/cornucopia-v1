import React from 'react';
import Box from '@mui/material/Box';
import Image from 'next/image';
import CowAnimation3 from '../components/cowAnimation3';
import twoBlades from '../images/two_blades.svg';
import threeBlades from '../images/three_blades.svg';
import tripleGrass from '../images/triple_grass.svg';
import fourGrass from '../images/four_grass.svg';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import styles from '../styles/Home.module.css';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContentText from '@mui/material/DialogContentText';
import DialogContent from '@mui/material/DialogContent';
import useMediaQuery from '@mui/material/useMediaQuery';

// img size is 1080 x 703
export default function Footer() {
    const [openTeam, setOpenTeam] = React.useState(false); 

    const smallScreen = useMediaQuery('(max-width: 619px)'); 
    const largeScreen = useMediaQuery('(min-width: 620px)'); 

    return ( 
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', position: 'absolute', bottom: 0, width: '100vw', overflow: 'hidden', }}> 
        <CowAnimation3 />
        <Box sx={{ display: 'flex', justifyContent: 'center', }}> 
          <Box sx={{ display: 'flex', justifyContent: 'center', }}>
            <Image alt="" src={tripleGrass} height="24px" width="121px"/>
            <Image alt="" src={twoBlades} height="24px" width="121px"/>          
            <Image alt="" src={threeBlades} height="24px" width="121px"/>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', minHeight:'24px', minWidth:'121px', alignItems: 'center', gap: '3px', justifyContent: 'center',}}>
            <Box> 
              <Image alt="" src="/corn_text.png" height="24px" width="121px"/>
            </Box>
            {largeScreen && 
              <Box sx={{ display: 'flex', gap: '2vw', }}> 
                <Typography className={styles.h2} sx={{ color: '#064829', fontSize: 12, textAlign: 'center', }}><Link sx= {{ color: 'rgb(233, 233, 198)', textDecoration: 'none'}} target="_blank" rel="noopener" href={"https://osec.io/"}>Audited by Ottersec</Link></Typography>
                <Button variant="text" className={styles.h2} sx={{ '&:hover': {backgroundColor: 'transparent'}, fontSize: 12, p: 0, m: 0, minWidth: 0}} onClick={() => setOpenTeam(true)}>About</Button>
                <Dialog open={openTeam} onClose={() => setOpenTeam(false)} PaperProps={{ style: { backgroundColor: "transparent", boxShadow: "none" }, }}>
                  <DialogTitle className={styles.formHeader}>About</DialogTitle>
                  <DialogContent className={styles.cardBackground}>
                    <DialogContentText className={styles.dialogBody}>
                      Alex and Shreya founded Cornucopia to provide a public forum for anyone to get involved in crypto with real, tangible contributions to the community.
                      <br />
                      <br />
                      Projects/DAOs can post bounties for freelancers to apply to. Once the bounty creator 
                      accepts the application, the bounty amount will be escrowed in the Cornucopia smart contract. After a freelancer submits their work, the 
                      creator can then choose to pay freelancer or dispute the bounty. A creator might dispute the bounty
                      if they think that the freelancer&apos;s submitted work doesn&apos;t match the bounty description. 
                      <br />
                      <br />
                      The freelancer then has 1 week to respond to the dispute: they can 
                      either dispute the creator&apos;s dispute or leave it and loose any chance of recuperating some of the bounty amount. If they choose to dispute, then the dispute 
                      is escalated to UMA token holders (using <Link target="_blank" rel="noopener" href="https://umaproject.org/products/optimistic-oracle">UMAs Optimistic Oracle</Link>) who then vote whether they think the freelancer did the work, did not do the work, or unclear whether the freelancer did the work.
                      In the first case, the freelancer gets paid the bounty amount plus half the bond the creator put up to dispute the work. In the second case, the creator gets their 
                      escrowed funds back plus half the bond the freelancer put up to dispute the creator&apos;s dispute. In the third case, the freelancer gets paid half the bounty amount and 
                      half the bond the creator put up to dispute the work while the creator gets half the bount amount back. 
                      <br />
                      <br />
                      We hope you enjoy and happy hunting!
                    </DialogContentText>
                  </DialogContent>
                </Dialog>
                <Typography className={styles.h2} sx={{ color: '#064829', fontSize: 12, textAlign: 'center', }}><Link sx= {{ color: 'rgb(233, 233, 198)', textDecoration: 'none'}} target="_blank" rel="noopener" href={"https://www.unigrants.org/"}>Supported by Uniswap Foundation</Link></Typography>
                
              </Box>
            }
            {smallScreen && 
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '0.5vw'}}>
                {/* <Typography className={styles.h2} sx={{ color: '#064829', fontSize: 8, wordWrap: 'break-word', textAlign: 'center'}}><Link sx= {{ color: 'rgb(233, 233, 198)', textDecoration: 'none'}} target="_blank" rel="noopener" href={"https://osec.io/"}>Audited by Ottersec</Link></Typography>
                <Typography className={styles.h2} sx={{ color: '#064829', fontSize: 8, wordWrap: 'break-word', textAlign: 'center'}}>Supported by Uniswap Foundation</Typography> */}
                <Button variant="text" className={styles.h2} sx={{ '&:hover': {backgroundColor: 'transparent'}, fontSize: 10, p: 0, m: 0, minWidth: 0}} onClick={() => setOpenTeam(true)}>About</Button>
                <Dialog open={openTeam} onClose={() => setOpenTeam(false)} PaperProps={{ style: { backgroundColor: "transparent", boxShadow: "none" }, }}>
                  <DialogTitle className={styles.formHeader}>About Us</DialogTitle>
                  <DialogContent className={styles.cardBackground}>
                    <DialogContentText className={styles.dialogBody}>
                      Cornucopia is audited by 
                      <Link sx= {{ color: 'rgb(233, 233, 198)', textDecoration: 'none'}} target="_blank" rel="noopener" href={"https://osec.io/"}> Ottersec </Link>
                      and supported by the Uniswap Foundation.
                      <br />
                      <br />
                      Alex and Shreya founded Cornucopia to provide a public forum for anyone to get involved in crypto with real, tangible contributions to the community.
                      <br />
                      <br />
                      Projects/DAOs can post bounties for freelancers to apply to. Once the bounty creator 
                      accepts the application, the bounty amount will be escrowed in the Cornucopia smart contract. After a freelancer submits their work, the 
                      creator can then choose to pay freelancer or dispute the bounty. A creator might dispute the bounty
                      if they think that the freelancer&apos;s submitted work doesn&apos;t match the bounty description. 
                      <br />
                      <br />
                      The freelancer then has 1 week to respond to the dispute: they can 
                      either dispute the creator&apos;s dispute or leave it and loose any chance of recuperating some of the bounty amount. If they choose to dispute, then the dispute 
                      is escalated to UMA token holders (using <Link target="_blank" rel="noopener" href="https://umaproject.org/products/optimistic-oracle">UMAs Optimistic Oracle</Link>) who then vote whether they think the freelancer did the work, did not do the work, or unclear whether the freelancer did the work.
                      In the first case, the freelancer gets paid the bounty amount plus half the bond the creator put up to dispute the work. In the second case, the creator gets their 
                      escrowed funds back plus half the bond the freelancer put up to dispute the creator&apos;s dispute. In the third case, the freelancer gets paid half the bounty amount and 
                      half the bond the creator put up to dispute the work while the creator gets half the bount amount back. 
                      <br />
                      <br />
                      We hope you enjoy and happy hunting! 
                    </DialogContentText>
                  </DialogContent>
                </Dialog>
              </Box>
          }
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'center'}}>
            <Image alt="" src={threeBlades} height="24px" width="121px"/>
            <Image alt="" src={twoBlades} height="24px" width="121px"/>
            <Image alt="" src={fourGrass} height="24px" width="121px"/>
          </Box>
        </Box>
      </Box>   
    );
};

// 	1212 × 238