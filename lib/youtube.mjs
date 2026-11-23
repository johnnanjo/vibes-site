import { svg } from './util.mjs';

export const YOUTUBE_HANDLE = '@vibes-billiards';
export const YOUTUBE_CHANNEL = `https://www.youtube.com/${YOUTUBE_HANDLE}`;

export function youtubeLink(label, className) {
  return `<a class="${className} youtube-link" href="${YOUTUBE_CHANNEL}" target="_blank" rel="noopener" aria-label="${label}">${svg('youtube', 20)}<span>${label}</span></a>`;
}

export function youtubeSection(config) {
  const validId = (id) => typeof id === 'string' && /^[\w-]{11}$/.test(id);
  const liveId = config.youtubeLiveVideoId;
  const latestId = config.youtubeLatestVideoId;
  const hasLive = validId(liveId);
  const videoId = hasLive ? liveId : validId(latestId) ? latestId : '';
  const eventTitle = '12/5 W3C 女王杯 ライブ配信';
  const streamUrl = hasLive ? `https://www.youtube.com/watch?v=${liveId}` : `${YOUTUBE_CHANNEL}/streams`;
  const player = videoId
    ? `<iframe src="https://www.youtube-nocookie.com/embed/${videoId}" title="${hasLive ? eventTitle : 'VIBES BILLIARDS TV 最新動画'}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="encrypted-media; picture-in-picture" allowfullscreen></iframe>`
    : `<a class="youtube-placeholder" href="${streamUrl}" target="_blank" rel="noopener">${svg('youtube', 44)}<span>配信一覧を開く</span></a>`;

  return `<section class="sec" id="vibes-tv" aria-labelledby="vibes-tv-title">
<div class="card dark youtube-card">
  <div class="youtube-copy">
    <h2 class="disp" id="vibes-tv-title">VIBES BILLIARDS TV <span>/ LIVE</span></h2>
    <p>3C試合映像・ライブ配信・カスタムシャフト検証・システム解説</p>
    ${youtubeLink(`チャンネル登録（${YOUTUBE_HANDLE}）`, 'btn btn-lime btn-sm')}
  </div>
  <div class="youtube-media">
    <div class="youtube-player">${player}</div>
    <div class="youtube-meta">
      <a href="${streamUrl}" target="_blank" rel="noopener">${eventTitle}</a>
      <a href="${YOUTUBE_CHANNEL}/videos" target="_blank" rel="noopener">最新動画 ›</a>
    </div>
  </div>
</div>
</section>`;
}
