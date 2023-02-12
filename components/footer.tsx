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

// img size is 1080 x 703
export default function Footer() {
    const [openTeam, setOpenTeam] = React.useState(false); 
    return ( 
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', position: 'relative', bottom: 0, width: '100vw', marginTop: '3vh', overflow: 'hidden', }}> 
        <CowAnimation3 />
        <Box sx={{ display: 'flex', justifyContent: 'center'}}> 
          <Box sx={{ display: 'flex', justifyContent: 'center'}}>
            <Image alt="" src={tripleGrass} height="24px" width="121px"/>
            <Image alt="" src={twoBlades} height="24px" width="121px"/>          
            <Image alt="" src={threeBlades} height="24px" width="121px"/>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', minHeight:'24px', minWidth:'121px', alignItems: 'center', gap: '3px'}}>
            <Box> 
            <Image alt="" src="/corn_text.png" height="24px" width="121px"/>
            </Box>
            <Box sx={{ display: 'flex', gap: '2vw'}}>
              <Typography className={styles.h2} sx={{ color: '#064829', fontSize: 10}}><Link sx= {{ color: 'rgb(233, 233, 198)', textDecoration: 'none'}} target="_blank" rel="noopener" href={"https://osec.io/"}>Audited by Ottersec</Link></Typography>
              <Typography className={styles.h2} sx={{ color: '#064829', fontSize: 10}}>Supported by Uniswap Foundation</Typography>
              <Button variant="text" className={styles.h2} sx={{ '&:hover': {backgroundColor: 'transparent'}, fontSize: 10, p: 0, m: 0, minWidth: 0}} onClick={() => setOpenTeam(true)}>Team</Button>
              <Dialog open={openTeam} onClose={() => setOpenTeam(false)} PaperProps={{ style: { backgroundColor: "transparent", boxShadow: "none" }, }}>
                <DialogTitle className={styles.formHeader}>About the Team</DialogTitle>
                <DialogContent className={styles.cardBackground}>
                  <DialogContentText className={styles.dialogBody}>
                    Shreya and Alex founded Cornucopia to provide a public and open forum for anyone to get involved in crypto with real, tangible contributions to the community.
                    We hope you enjoy and happy hunting! 
                  </DialogContentText>
                </DialogContent>
              </Dialog>
            </Box>
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