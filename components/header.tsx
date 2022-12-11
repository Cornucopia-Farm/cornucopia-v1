import React from 'react';
import Box from '@mui/material/Box';
import Link from 'next/link';
import Button from '@mui/material/Button';
import Image from 'next/image';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import styles from '../styles/Home.module.css';
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import MenuIcon from "@mui/icons-material/Menu";
import { useMediaQuery } from '@mui/material';

export default function HeaderTabs() {

  const smallScreen = useMediaQuery('(max-width: 950px)');
  const largeScreen = useMediaQuery('(min-width: 951px)');

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = React.useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorElement(event.currentTarget);
  }, []);

  const handleClose = React.useCallback(() => {
    setAnchorEl(null);
  }, []);

  return ( 
    <Box className={styles.header} sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', borderColor: 'divider', justifyContent: 'space-between', }}>
      <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-around', gap: '12px', }}> 
        <Box sx={{minWidth:'100px', minHeight:'100px', }}>
            <Image alt="" src="/corn_logo.png" height="100px" width="100px"/>
        </Box>
        {largeScreen && 
        <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-around', gap: '24px', }}> 
          <Link href="/openBounties" >
            <Button className={styles.headerFont} sx={{ fontSize: '16px', }}>Open Bounties</Button>
          </Link>

          <Link href="/myBounties">
              <Button className={styles.headerFont} sx={{ fontSize: '16px', }}>My Bounties</Button>
          </Link>
          
          <Link href="/createBounties">
            <Button className={styles.headerFont} sx={{ fontSize: '16px', }}>Create Bounties</Button>
          </Link>
        </Box>
        }
        {smallScreen &&
          <div>  
            <Button
              id="basic-button"
              aria-controls={open ? 'basic-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={open ? 'true' : undefined}
              onClick={handleClick}
            >
              <MenuIcon fontSize="large" />
            </Button>
            <Menu
              id="basic-menu"
              anchorEl={anchorEl}
              open={open}
              onClose={handleClose}
              MenuListProps={{
                'aria-labelledby': 'basic-button',
              }}
            >
              <MenuItem onClick={handleClose}>
              <Link href="/openBounties" >
            <Button className={styles.headerFont} sx={{ fontSize: '16px', }}>Open Bounties</Button>
          </Link>
              </MenuItem>
              <MenuItem onClick={handleClose}>My account</MenuItem>
              <MenuItem onClick={handleClose}>Logout</MenuItem>
            </Menu>
          </div>
        }
      </Box>
      {/* <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', }}>  */}
        <Box sx={{ paddingRight: '24px'}}> 
          <ConnectButton />
        </Box>
        {/* <Box>
          <Image alt="" src="/corn_logo.png" height="100px" width="100px"/>
        </Box> */}
      {/* </Box> */}
    </Box>   
  );
};
