// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { Octokit } from 'octokit';

const getSocialData = async () => {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN, });
  
  const response = await octokit.request(`GET /gists/${process.env.GIST_ID}`, {
    gist_id: process.env.GIST_ID,
    headers: {
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });

  return JSON.parse(response.data.files[process.env.GIST_FILENAME!].content);
};

const updateSocialData = async (updatedData: any) => {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN, });

  const response = await octokit.request(`PATCH /gists/${process.env.GIST_ID}`, {
    gist_id: process.env.GIST_ID,
    description: 'updated mapping',
    files: {
      [process.env.GIST_FILENAME!]: {
        content: JSON.stringify(updatedData)
      }
    },
    headers: {
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });

  return response.data;
};


export default async function handler(req: any, res: any) { // Making this a type causes prod issues
  if (req.method === 'GET') {
    try {
      const socialData = await getSocialData();
      res.status(200).json({socialData});
    } catch (error) {
      res.status(500).send(error);
    }
  } else if (req.method === 'PATCH') {
    try {
        const socialData = await updateSocialData(req.body.updatedData);
        res.status(200).json({socialData});
    } catch (error) {
        res.status(500).send(error);
    }
  }
};