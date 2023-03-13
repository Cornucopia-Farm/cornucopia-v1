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
import DragHandleIcon from '@mui/icons-material/DragHandle';
import useMediaQuery from '@mui/material/useMediaQuery';
import { signIn, signOut, useSession } from 'next-auth/react';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

export default function HeaderTabs() {

  const { data: session, status } = useSession();

  console.log(session)

  const smallScreen = useMediaQuery('(min-width: 481px) and (max-width: 950px)');
  const largeScreen = useMediaQuery('(min-width: 951px)');
  const mobileScreen = useMediaQuery('(max-width: 380px)');
  const largeMobileScreen = useMediaQuery('(min-width: 381px) and (max-width: 480px)');

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = React.useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleClose = React.useCallback(() => {
    setAnchorEl(null);
  }, []);

  const [openLogin, setOpenLogin] = React.useState(false);

  const handleOpenLogin = () => {
    setOpenLogin(true);
  };

  const handleCloseLogin = () => {
    setOpenLogin(false);
  };

  return ( 
    <Box className={styles.header} sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', borderColor: 'divider', ...(mobileScreen ?  {justifyContent: 'space-between', } : {justifyContent: 'space-between'}), }}>
      <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', ...(mobileScreen ?  { gap: '0px', } : { gap: '12px', }) }}> 
        <Link href="/openBounties" >
        <Box sx={{ minWidth:'100px', minHeight:'100px', ...(mobileScreen ? {marginRight: '-12px', marginLeft: '-10px'} : {})}}>
            <Image alt="" src="/corn_logo.png" height="100px" width="100px"/>
        </Box>
        </Link>
        {largeScreen && 
          <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-around', gap: '24px', }}> 
            <Link href="/openBounties" >
              <Button disableRipple className={styles.headerFont} sx={{ fontSize: '16px', '&:hover': { backgroundColor: 'transparent', }, }}>Open Bounties</Button>
            </Link>

            <Link href="/myBounties">
                <Button disableRipple className={styles.headerFont} sx={{ fontSize: '16px', '&:hover': { backgroundColor: 'transparent', }, }}>My Bounties</Button>
            </Link>
            
            <Link href="/createBounties">
              <Button disableRipple className={styles.headerFont} sx={{ fontSize: '16px', '&:hover': { backgroundColor: 'transparent', }, }}>Create Bounties</Button>
            </Link>
          </Box>
        }
        {mobileScreen && 
          <Box> 
            <ConnectButton 
              accountStatus={{
                smallScreen: 'avatar',
                largeScreen: 'full',
              }}
            />
          </Box>
        }
      </Box>
        <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', }}> 
        {(!mobileScreen && !largeMobileScreen) && 
          <Box> 
            <ConnectButton />
          </Box>
        }
        {largeMobileScreen && 
          <Box> 
            <ConnectButton 
              accountStatus={{
                smallScreen: 'avatar',
                largeScreen: 'full',
              }}
            />
          </Box>
        }
        <Button disableRipple className={styles.farmer} sx={{ ...(largeScreen ? { paddingRight: '20px' } : (mobileScreen ? { paddingRight: '0px',  } : { paddingRight: '5px', })), }} onClick={handleOpenLogin}>
          <Image alt="" src="/farmer_crop1.png" height="38px" width="38px"/>
        </Button>
        <Dialog open={openLogin} onClose={handleCloseLogin} PaperProps={{ style: { backgroundColor: "transparent", boxShadow: "none" }, }}>
          <DialogTitle className={styles.formHeader}>Link your Account</DialogTitle>
          <DialogContent className={styles.cardBackground}>
              <DialogContentText className={styles.dialogBody}>
              You can use your Github account as your identity on Cornucopia or just use your Ens/address.
              </DialogContentText>
          </DialogContent>
          <DialogActions className={styles.formFooter}>
          <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(248, 215, 154)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px', '&:disabled': { backgroundColor: 'grey', }, }} onClick={() => {!session ? signIn('github') : signOut({redirect: false}); handleCloseLogin(); }} autoFocus>
            <Box sx={{ display: 'flex', gap: '6px', }}> 
              <Image alt="" src="/github-mark.png" height="25px" width="25px"/>
              {!session ? 'sign in' : 'sign out'}
            </Box>
          </Button>
          {/* <Button variant="contained" sx={{ '&:hover': {backgroundColor: 'rgb(182, 182, 153)'}, backgroundColor: 'rgb(248, 215, 154)', color: 'black', fontFamily: 'Space Grotesk', borderRadius: '12px', '&:disabled': { backgroundColor: 'grey', }, }} onClick={() => {!session ? signIn('twitter') : signOut({redirect: false}); handleCloseLogin(); }} autoFocus>
            <Box sx={{ display: 'flex', gap: '6px', }}> 
              <Image alt="" src="/twitter.png" height="25px" width="25px"/>
              {!session ? 'sign in' : 'sign out'}
            </Box>
          </Button> */}
          </DialogActions>
        </Dialog>
      {(smallScreen || mobileScreen || largeMobileScreen) &&
          <Box sx={{ ...(mobileScreen ? { marginLeft: '-20px' } : {})}}>  
            <Button
              id="basic-button"
              aria-controls={open ? 'basic-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={open ? 'true' : undefined}
              onClick={handleClick}
              sx={{ color: 'rgb(248, 215, 154)', ...(mobileScreen ? { paddingRight: '0px', } : { paddingRight: '25px', })}}
            >
              <DragHandleIcon fontSize="large" />
            </Button>
            <Menu
              id="basic-menu"
              anchorEl={anchorEl}
              open={open}
              onClose={handleClose}
              MenuListProps={{
                "aria-labelledby": "basic-button",
                disablePadding: true,
              }}
              sx={{ 
                '& .MuiMenu-list': {
                  backgroundColor: 'rgb(248, 215, 154) !important',
                }, 
                '& .MuiMenu-paper': {
                  borderRadius: '12px',

                },
                
              }}
            >
              <MenuItem onClick={handleClose}>
                <Link href="/openBounties">
                  <Button className={styles.headerFontDropdown} sx={{ fontSize: '16px', }}>Open Bounties</Button>
                </Link>
              </MenuItem>
              <MenuItem onClick={handleClose}>
                <Link href="/myBounties">
                  <Button className={styles.headerFontDropdown} sx={{ fontSize: '16px', }}>My Bounties</Button>
                </Link>
              </MenuItem>
              <MenuItem onClick={handleClose}>
                <Link href="/createBounties">
                  <Button className={styles.headerFontDropdown} sx={{ fontSize: '16px', }}>Create Bounties</Button>
                </Link>
              </MenuItem>
            </Menu>
          </Box>
      }
      </Box>
    </Box>   
  );
};
