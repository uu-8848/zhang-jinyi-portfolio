// 每个项目都保留独立的影片链接。
// 可填写已托管的影片地址，或本站 /assets/ 下的影片路径。
export const filmLinks = {
  'sleep-no-more': '/assets/films/sleep-no-more.mp4',
  'mr-xu': '/assets/films/mr-xu.mp4',
  'four-seasons': null,
  'endless-tower': '/assets/films/endless-tower.mp4',
  'pop-mart': null,
  'suspended-state': '/assets/films/suspended-state/film.m3u8',
  'showreel': '/assets/films/showreel.mp4',
};

export function resolveFilmLink(id) {
  const value = filmLinks[id];
  if (!value) return null;
  if (value.startsWith('/assets/') && !value.includes('..')) return value;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}
