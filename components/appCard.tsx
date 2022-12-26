import * as React from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import styles from '../styles/Home.module.css';
import { BountyOutcome } from '../getEscrowEventData';
import { useMediaQuery } from '@mui/material';

type Props = {
  experience: string;
  contactInfo: string;
  arweaveHash: string;
  links: string;
  workLinks?: string;
  children?: React.ReactNode;
  finishedStatus?: BountyOutcome;
};

const BasicCard: React.FC<Props> = props => {

  const mobileScreen = useMediaQuery('(max-width: 500px)');
  const largeScreen = useMediaQuery('(min-width: 501px)');

  const showLinks = (links: string) => {
    return links.split(",").map(link => {
        return (
          <Link key={link} sx= {{ color: 'rgb(233, 233, 198)'}} target="_blank" rel="noopener" href={"https://" + link}>{link}</Link>
        );
    });
  };

  return (
    <Card className={styles.cardBackground} sx={{ minWidth: '275', borderRadius: '12px',  }}>
      <CardContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', paddingLeft: '1px', paddingRight: '1px', paddingTop: '1px' }}>
          {largeScreen &&
          <> 
          <Box sx={{ display: 'flex', paddingLeft: 0, paddingBottom: 1, }}> 
            <Typography className={styles.cardTag} sx={{ fontSize: 16, color: '#064829', width: '45%'}}>Experience </Typography>
            <Typography className={styles.cardInfo} sx={{fontSize: 16, color: '#064829', width: '45%'}}>{props.experience}</Typography>
          </Box>
          <Box sx={{ display: 'flex', paddingLeft: 0}}> 
            <Typography className={styles.cardTag} sx={{ fontSize: 16, color: '#064829', width: '45%'}}>Contact Info </Typography>
            <Typography className={styles.cardInfo} sx={{fontSize: 16, color: '#064829', width: '45%'}}>{props.contactInfo}</Typography>
          </Box>
          <Box sx={{ display: 'flex', paddingLeft: 0}}> 
            <Typography className={styles.cardTag} sx={{ fontSize: 16, color: '#064829', width: '45%'}}>Links </Typography>
            <Typography className={styles.cardInfo} sx={{fontSize: 16, color: '#064829', width: '45%', overflow: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none', }, }}>
              {showLinks(props.links)}
            </Typography>
          </Box>
          </>
          }
          {mobileScreen &&
          <> 
          <Box sx={{ display: 'flex', flexDirection: 'column', paddingLeft: 0, paddingBottom: 1, }}> 
            <Typography className={styles.cardTag} sx={{ fontSize: 16, color: '#064829', paddingBottom: 0.5, }}>Experience </Typography>
            <Typography className={styles.cardInfo} sx={{fontSize: 16, color: '#064829', }}>{props.experience}</Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', paddingLeft: 0, paddingBottom: 1,}}> 
            <Typography className={styles.cardTag} sx={{ fontSize: 16, color: '#064829', }}>Contact Info </Typography>
            <Typography className={styles.cardInfo} sx={{fontSize: 16, color: '#064829', }}>{props.contactInfo}</Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', paddingLeft: 0, paddingBottom: 1,}}> 
            <Typography className={styles.cardTag} sx={{ fontSize: 16, color: '#064829', }}>Links </Typography>
            <Typography className={styles.cardInfo} sx={{fontSize: 16, color: '#064829', overflow: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none', }, }}>
              {showLinks(props.links)}
            </Typography>
          </Box>
          </>
          }
          {largeScreen && props.workLinks &&
            <Box sx={{ display: 'flex', paddingLeft: 0}}> 
              <Typography className={styles.cardTag} sx={{ fontSize: 16, color: '#064829', width: '45%'}}>Work Links </Typography>
              <Typography className={styles.cardInfo} sx={{fontSize: 16, color: '#064829', width: '45%', overflow: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none', }, }}>
                {showLinks(props.workLinks)}
              </Typography>
            </Box>
          }
          {mobileScreen && props.workLinks &&
            <Box sx={{ display: 'flex', flexDirection: 'column', paddingLeft: 0, paddingBottom: 1, }}> 
              <Typography className={styles.cardTag} sx={{ fontSize: 16, color: '#064829', }}>Work Links </Typography>
              <Typography className={styles.cardInfo} sx={{fontSize: 16, color: '#064829', overflow: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none', }, }}>
                {showLinks(props.workLinks)}
              </Typography>
            </Box>
          }
          {largeScreen && 
          <Box sx={{ display: 'flex', paddingLeft: 0}}> 
            <Typography className={styles.cardTag} sx={{ fontSize: 16, color: '#064829', width: '45%'}}>Arweave Hash </Typography>
            <Typography className={styles.cardInfo} sx={{fontSize: 16, color: '#064829', width: '45%', overflow: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none', }, }}>
              <Link sx= {{ color: 'rgb(233, 233, 198)'}} target="_blank" rel="noopener" href={"https://arweave.net/" + props.arweaveHash}>{props.arweaveHash}</Link>
            </Typography>
          </Box>
          }
          {mobileScreen && 
          <Box sx={{ display: 'flex', flexDirection: 'column', paddingLeft: 0, ...(props.finishedStatus?.normalPayout === false && { paddingBottom: 1, }),}}> 
            <Typography className={styles.cardTag} sx={{ fontSize: 16, color: '#064829', }}>Arweave Hash </Typography>
            <Typography className={styles.cardInfo} sx={{fontSize: 16, color: '#064829', overflow: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none', }, }}>
              <Link sx= {{ color: 'rgb(233, 233, 198)'}} target="_blank" rel="noopener" href={"https://arweave.net/" + props.arweaveHash}>{props.arweaveHash}</Link>
            </Typography>
          </Box>
          }
          {largeScreen && props.finishedStatus?.normalPayout === false &&
            <Box sx={{ display: 'flex', paddingLeft: 0}}> 
              <Typography className={styles.cardTag} sx={{ fontSize: 16, color: '#064829', width: '45%'}}>Outcome </Typography>
              {props.finishedStatus?.creatorRefunded === true &&
                <Typography className={styles.cardInfo} sx={{fontSize: 16, color: '#064829', width: '45%'}}>Creator refunded</Typography>
              }
              {props.finishedStatus?.hunterForcePayout === true &&
                <Typography className={styles.cardInfo} sx={{fontSize: 16, color: '#064829', width: '45%'}}>Hunter force payed out</Typography>
              }
              {props.finishedStatus?.disputed === true && props.finishedStatus?.creatorWins === true &&
                <Typography className={styles.cardInfo} sx={{fontSize: 16, color: '#064829', width: '45%'}}>Creator won dispute</Typography>
              }
              {props.finishedStatus?.disputed === true && props.finishedStatus?.hunterWins === true &&
                <Typography className={styles.cardInfo} sx={{fontSize: 16, color: '#064829', width: '45%'}}>Hunter won dispute</Typography>
              }
              {props.finishedStatus?.disputed === true && props.finishedStatus?.tie === true &&
                <Typography className={styles.cardInfo} sx={{fontSize: 16, color: '#064829', width: '45%'}}>Dispute tied</Typography>
              }
            </Box>
          }
          {mobileScreen && props.finishedStatus?.normalPayout === false &&
            <Box sx={{ display: 'flex', flexDirection: 'column', paddingLeft: 0}}> 
              <Typography className={styles.cardTag} sx={{ fontSize: 16, color: '#064829', }}>Outcome </Typography>
              {props.finishedStatus?.creatorRefunded === true &&
                <Typography className={styles.cardInfo} sx={{fontSize: 16, color: '#064829', }}>Creator refunded</Typography>
              }
              {props.finishedStatus?.hunterForcePayout === true &&
                <Typography className={styles.cardInfo} sx={{fontSize: 16, color: '#064829', }}>Hunter force payed out</Typography>
              }
              {props.finishedStatus?.disputed === true && props.finishedStatus?.creatorWins === true &&
                <Typography className={styles.cardInfo} sx={{fontSize: 16, color: '#064829', }}>Creator won dispute</Typography>
              }
              {props.finishedStatus?.disputed === true && props.finishedStatus?.hunterWins === true &&
                <Typography className={styles.cardInfo} sx={{fontSize: 16, color: '#064829', }}>Hunter won dispute</Typography>
              }
              {props.finishedStatus?.disputed === true && props.finishedStatus?.tie === true &&
                <Typography className={styles.cardInfo} sx={{fontSize: 16, color: '#064829', }}>Dispute tied</Typography>
              }
            </Box>
          }
        </Box>
      </CardContent>
      <CardActions>
        {props.children}
      </CardActions>
    </Card>
  );
};

export default BasicCard;
