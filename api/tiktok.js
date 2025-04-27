// file: api/tiktok.js
const axios = require('axios');

async function getCDNFileSize(url) {
  try {
    const res = await axios.head(url, {
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TikwmFetcher/1.0)'
      }
    });
    const size = res.headers["content-length"];
    return size ? (parseInt(size) / (1024 * 1024)).toFixed(2) : null;
  } catch (err) {
    console.error("❌ Gagal ambil ukuran file:", err.message);
    return null;
  }
}

async function getTikTokVideoData(tiktokUrl) {
  if (!tiktokUrl) throw new Error("URL TikTok diperlukan");

  const { data } = await axios.get('https://www.tikwm.com/api/', {
    params: {
      url: tiktokUrl,
      hd: 1
    }
  });

  if (!data?.data) throw new Error("Data TikTok tidak ditemukan");

  const d = data.data;
  const type = Array.isArray(d.images) && d.images.length ? "image" : "video";

  const result = {
    id: d.id,
    title: d.title,
    author_id: d.author?.id || null,
    author_url: d.author?.id ? `https://tiktok.com/@${d.author.id}` : null,
    author_name: d.author?.nickname || "Tidak diketahui",
    cover: d.cover,
    type,
    sources: {},
    images: [],
    size_play: null,
    size_hdplay: null,
    size_wmplay: null
  };

  if (type === "image") {
    result.images = d.images;
    result.sources.music = d.music || null;
  } else {
    result.sources = {
      play: d.play || null,
      wmplay: d.wmplay || null,
      hdplay: d.hdplay || null,
      music: d.music || null
    };

    if (result.sources.play) {
      result.size_play = await getCDNFileSize(result.sources.play);
    }
    if (result.sources.wmplay) {
      result.size_wmplay = await getCDNFileSize(result.sources.wmplay);
    }
    if (result.sources.hdplay) {
      result.size_hdplay = await getCDNFileSize(result.sources.hdplay);
    }
  }

  return result;
}

// === Vercel handler (API Endpoint) ===
module.exports = async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ status: false, message: "Masukkan URL TikTok di query ?url=" });
  }

  try {
    const videoData = await getTikTokVideoData(url);
    res.status(200).json({ status: true, result: videoData });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};
