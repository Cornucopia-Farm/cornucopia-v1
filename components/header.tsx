import React from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Link from 'next/link';
import Button from '@mui/material/Button';
import Image from 'next/image';
// import { Wallet } from './wallet';
import { useProvider } from 'wagmi';
import { twitterAuthorize } from "@cyberlab/social-verifier";
import { useAccount, useConnect } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import styles from '../styles/Home.module.css';

export default function HeaderTabs() {

  const [open, setOpen] = React.useState(false);
  const [popUp, setPopUp] = React.useState(false);
  const [address, setAddress] = React.useState(null);
  let sig: Promise<String>;

  const handleClickOpen = () => {
      setOpen(true);
  };

  const handleClose = () => {
      setOpen(false);
  };

  const handlePopUp = () => {
    setPopUp(true);
    const text = `Verifying my identity on @cornucopiaproj: ${sig}`;
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
  };

  // const [{ data: accountData }, disconnect] = useAccount({
  //   fetchEns: true,
  // });

  // if (accountData) {
  //     const address = accountData.address;
  //     const provider = useProvider();
  //     sig = twitterAuthorize(provider, address);
  // }


  return ( 
    <Box className={styles.header} sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', borderColor: 'divider', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-around', marginLeft: '16px', gap: '32px'}}> 
        {/* <Tabs> */}
          <Link href="/openBounties" >
            <Button className={styles.headerFont} sx={{ fontSize: '16px' }}>Open Bounties</Button>
          </Link>

          <Link href="/myBounties">
              <Button className={styles.headerFont} sx={{ fontSize: '16px' }}>My Bounties</Button>
          </Link>
          
          <Link href="/createBounties">
            <Button className={styles.headerFont} sx={{ fontSize: '16px' }}>Create Bounties</Button>
          </Link>

          {/* <Link href="/disputes">
            <Tab label="Disputes" />
          </Link> */}
        {/* </Tabs> */}
        </Box>
        {/* <Button variant="contained" sx={{ backgroundColor: 'rgba(6, 72, 41, 0.15)', borderRadius: '12px', marginRight: '32px', }} onClick={handlePopUp}>Verify Account</Button> */}
        {/* <Button variant="contained" sx={{ backgroundColor: 'rgba(6, 72, 41, 0.85)', borderRadius: '12px', marginRight: '32px', }} onClick={handleClickOpen}>{address ? address : "Connect Wallet"}</Button>
        <Wallet open={open} onClose={handleClose} onConnect={setAddress} /> */}

        <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center',  }}> 
          <Box> 
          <ConnectButton />
          </Box>
        <Box>
          <Image src="/corn_logo.png" height="100px" width="100px"/>
          {/* <Image src="/corn_logo copy.png" height="125px" width="125px"/> */}
        </Box>
        </Box>
    </Box>   
  );
};
