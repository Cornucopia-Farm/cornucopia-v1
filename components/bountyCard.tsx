import * as React from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import styles from '../styles/Home.module.css';
import { BountyOutcome } from '../getEscrowEventData';
import { useMediaQuery } from '@mui/material';

type Props = {
  description: string;
  startDate: Dayjs;
  endDate: Dayjs;
  arweaveHash: string;
  links: Array<string>;
  workLinks?: Array<string>;
  children?: React.ReactNode;
  finishedStatus?: BountyOutcome;
};

const BasicCard: React.FC<Props> = props => {

  // const smallScreen = false // useMediaQuery('(max-width: 622px)');
  // const largeScreen = true //useMediaQuery('(min-width: 623px)');

  return (
    <Card className={styles.cardBackground} sx={{ minWidth: '275', borderRadius: '12px', }}>
      <CardContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', paddingLeft: '1px', paddingRight: '1px', paddingTop: '1px', }}>
          <Box sx={{ display: 'flex', paddingLeft: 0, paddingBottom: 1}}> 
            <Typography className={styles.cardTag} sx={{ fontSize: 16, color: '#064829', width: '45%'}}>Description </Typography>
            <Typography className={styles.cardInfo} sx={{fontSize: 16, color: '#064829', width: '45%'}}>{props.description}</Typography>
          </Box>
          <Box sx={{ display: 'flex', paddingLeft: 0}}> 
            <Typography className={styles.cardTag} sx={{ fontSize: 16, color: '#064829', width: '45%'}}>Start Date </Typography>
            <Typography className={styles.cardInfo} sx={{fontSize: 16, color: '#064829', width: '45%'}}>{dayjs(props.startDate).format('MM-DD-YYYY')}</Typography>
          </Box>
          <Box sx={{ display: 'flex', paddingLeft: 0}}> 
            <Typography className={styles.cardTag} sx={{ fontSize: 16, color: '#064829', width: '45%'}}>End Date </Typography>
            <Typography className={styles.cardInfo} sx={{fontSize: 16, color: '#064829', width: '45%'}}>{dayjs(props.endDate).format('MM-DD-YYYY')}</Typography>
          </Box>
          <Box sx={{ display: 'flex', paddingLeft: 0}}> 
            <Typography className={styles.cardTag} sx={{ fontSize: 16, color: '#064829', width: '45%'}}>Links </Typography>
            <Typography className={styles.cardInfo} sx={{fontSize: 16, color: '#064829', width: '45%'}}>{props.links}</Typography>
          </Box>
          
          {/* {smallScreen &&
          <div> 
          <Box sx={{ display: 'flex', flexDirection: 'column', paddingLeft: 0, paddingBottom: 1}}> 
            <Typography className={styles.cardTag} sx={{ fontSize: 16, color: '#064829', width: '45%'}}>Description </Typography>
            <Typography className={styles.cardInfo} sx={{fontSize: 16, color: '#064829', width: '45%'}}>{props.description}</Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', paddingLeft: 0}}> 
            <Typography className={styles.cardTag} sx={{ fontSize: 16, color: '#064829', width: '45%'}}>Start Date </Typography>
            <Typography className={styles.cardInfo} sx={{fontSize: 16, color: '#064829', width: '45%'}}>{dayjs(props.startDate).format('MM-DD-YYYY')}</Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', paddingLeft: 0}}> 
            <Typography className={styles.cardTag} sx={{ fontSize: 16, color: '#064829', width: '45%'}}>End Date </Typography>
            <Typography className={styles.cardInfo} sx={{fontSize: 16, color: '#064829', width: '45%'}}>{dayjs(props.endDate).format('MM-DD-YYYY')}</Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', paddingLeft: 0}}> 
            <Typography className={styles.cardTag} sx={{ fontSize: 16, color: '#064829', width: '45%'}}>Links </Typography>
            <Typography className={styles.cardInfo} sx={{fontSize: 16, color: '#064829', width: '45%'}}>{props.links}</Typography>
          </Box>
          </div>
          } */}
          {props.workLinks &&
            <Box sx={{ display: 'flex', paddingLeft: 0}}> 
              <Typography className={styles.cardTag} sx={{ fontSize: 16, color: '#064829', width: '45%'}}>Work Links </Typography>
              <Typography className={styles.cardInfo} sx={{fontSize: 16, color: '#064829', width: '45%'}}>{props.workLinks}</Typography>
            </Box>
          }
          <Box sx={{ display: 'flex', paddingLeft: 0}}> 
            <Typography className={styles.cardTag} sx={{ fontSize: 16, color: '#064829', width: '45%'}}>Arweave Hash </Typography>
            <Typography className={styles.arweaveHash} sx={{fontSize: 16, color: '#064829', width: '45%'}}>
              <Link sx= {{ color: 'rgb(233, 233, 198)'}} target="_blank" rel="noopener" href={"https://arweave.net/" + props.arweaveHash}>{props.arweaveHash}</Link>
            </Typography>
          </Box>
          
          {props.finishedStatus?.normalPayout === false &&
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
        
        </Box>
      </CardContent>
      <CardActions>
        {props.children}
      </CardActions>
    </Card>
  );
};

export default BasicCard;
