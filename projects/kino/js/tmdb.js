/* ============================================================
   aenesche.de — Kino Hub / TMDb Wrapper

   <script src="/projects/kino/js/tmdb.js"></script>
   → window.tmdb.search(q), window.tmdb.poster(path, size), ...

   Hinweis: Der v3-Key ist ein reiner Read-Key und darf laut TMDb
   client-seitig eingebunden werden.
   ============================================================ */
(function () {
  const API_KEY = '5f38e8056ec4939adb0e769d41ef57ed';
  const BASE    = 'https://api.themoviedb.org/3';
  const IMG     = 'https://image.tmdb.org/t/p';
  const LANG    = 'de-DE';

  let genreMap = null;          // {id: name}
  let genrePromise = null;

  function url(path, params) {
    const u = new URL(BASE + path);
    u.searchParams.set('api_key', API_KEY);
    u.searchParams.set('language', LANG);
    for (const k in (params || {})) u.searchParams.set(k, params[k]);
    return u.toString();
  }

  async function get(path, params) {
    const res = await fetch(url(path, params));
    if (!res.ok) throw new Error('TMDb ' + res.status);
    return res.json();
  }

  /* Genre-Tabelle einmalig laden und cachen */
  async function genres() {
    if (genreMap) return genreMap;
    if (!genrePromise) {
      genrePromise = get('/genre/movie/list')
        .then(d => {
          genreMap = {};
          (d.genres || []).forEach(g => { genreMap[g.id] = g.name; });
          return genreMap;
        })
        .catch(() => (genreMap = {}));
    }
    return genrePromise;
  }

  /* Rohes TMDb-Ergebnis → schlankes Objekt für unsere DB */
  function normalize(m, gmap) {
    return {
      tmdb_id:       m.id,
      title:         m.title || m.original_title || 'Unbekannt',
      year:          m.release_date ? parseInt(m.release_date.slice(0, 4), 10) || null : null,
      poster_path:   m.poster_path || null,
      backdrop_path: m.backdrop_path || null,
      overview:      m.overview || null,
      genres:        (m.genre_ids || []).map(id => gmap[id]).filter(Boolean),
      tmdb_rating:   m.vote_average ? Math.round(m.vote_average * 10) / 10 : null
    };
  }

  async function search(query, limit) {
    const q = (query || '').trim();
    if (q.length < 2) return [];
    const gmap = await genres();
    const data = await get('/search/movie', { query: q, include_adult: 'false', page: '1' });
    return (data.results || [])
      .filter(m => m.title || m.original_title)
      .slice(0, limit || 8)
      .map(m => normalize(m, gmap));
  }

  async function popular(limit) {
    const gmap = await genres();
    const data = await get('/movie/popular', { page: '1' });
    return (data.results || []).slice(0, limit || 8).map(m => normalize(m, gmap));
  }

  function poster(path, size) {
    if (!path) return null;
    return IMG + '/' + (size || 'w185') + path;
  }
  function backdrop(path, size) {
    if (!path) return null;
    return IMG + '/' + (size || 'w780') + path;
  }
  function link(tmdbId) {
    return tmdbId ? 'https://www.themoviedb.org/movie/' + tmdbId : null;
  }

  window.tmdb = { search, popular, poster, backdrop, link, genres };
})();
