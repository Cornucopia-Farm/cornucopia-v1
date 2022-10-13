import * as React from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { flexbox } from '@mui/system';
import Link from '@mui/material/Link';
import styles from '../styles/Home.module.css';

type Props = {
  experience: string;
  contactInfo: string;
  arweaveHash: string;
  links: Array<string>;
  workLinks?: Array<string>;
  children?: React.ReactNode;
};

const BasicCard: React.FC<Props> = props => {
  return (
    <Card className={styles.cardBackground} sx={{ minWidth: '275', borderRadius: '12px',  }}>
      <CardContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', paddingLeft: '1px', paddingRight: '1px', paddingTop: '1px' }}>
          <Box sx={{ display: 'flex', paddingLeft: 0}}> 
            <Typography className={styles.cardTag} sx={{ fontSize: 16, color: '#064829', width: '45%'}}>Experience </Typography>
            <Typography className={styles.cardInfo} sx={{fontSize: 16, color: '#064829', width: '45%'}}>{props.experience}</Typography>
          </Box>
          <Box sx={{ display: 'flex', paddingLeft: 0}}> 
            <Typography className={styles.cardTag} sx={{ fontSize: 16, color: '#064829', width: '45%'}}>Contact Info </Typography>
            <Typography className={styles.cardInfo} sx={{fontSize: 16, color: '#064829', width: '45%'}}>{props.contactInfo}</Typography>
          </Box>
          <Box sx={{ display: 'flex', paddingLeft: 0}}> 
            <Typography className={styles.cardTag} sx={{ fontSize: 16, color: '#064829', width: '45%'}}>Links </Typography>
            <Typography className={styles.cardInfo} sx={{fontSize: 16, color: '#064829', width: '45%'}}>{props.links}</Typography>
          </Box>
          <Box sx={{ display: 'flex', paddingLeft: 0}}> 
            <Typography className={styles.cardTag} sx={{ fontSize: 16, color: '#064829', width: '45%'}}>Work Links </Typography>
            <Typography className={styles.cardInfo} sx={{fontSize: 16, color: '#064829', width: '45%'}}>{props.workLinks}</Typography>
          </Box>
          <Box sx={{ display: 'flex', paddingLeft: 0}}> 
            <Typography className={styles.cardTag} sx={{ fontSize: 16, color: '#064829', width: '45%'}}>Arweave Hash </Typography>
            <Typography className={styles.cardInfo} sx={{fontSize: 16, color: '#064829', width: '45%'}}>
              <Link target="_blank" rel="noopener" href={"https://arweave.net/" + props.arweaveHash}>{props.arweaveHash}</Link>
            </Typography>
          </Box>
        </Box>
      </CardContent>
      <CardActions>
        {props.children}
      </CardActions>
    </Card>
  );
};

export default BasicCard;
