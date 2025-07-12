import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const YT_API_KEY = process.env.YOUTUBE_API_KEY;

export default async function resolveYouTubeVideoInfo(videoUrl) {
  let videoId;
  try {
    const urlObj = new URL(videoUrl);
    videoId = urlObj.searchParams.get('v');
    // Sanitize: Only use the videoId, ignore other params
    if (videoId && videoId.includes('&')) {
      videoId = videoId.split('&')[0];
    }
  } catch (e) {
    throw new Error('Invalid YouTube video URL');
  }

  if (!videoId) throw new Error('Invalid YouTube video URL');

  const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${YT_API_KEY}`;
  const response = await fetch(apiUrl);
  const data = await response.json();

  if (!data.items || data.items.length === 0) {
    throw new Error('Video not found');
  }

  const { title, channelTitle } = data.items[0].snippet;

  return {
    title,
    artist: channelTitle,
  };
} 