// Filename: netlify/functions/get-news.js

// API Keys ko Netlify ke Environment Variables mein store karein, yahan direct na likhein.
const MEDIASTACK_KEY = process.env.MEDIASTACK_API_KEY;
const NEWSDATA_KEY = process.env.NEWSDATA_API_KEY;
const GNEWS_KEY = process.env.GNEWS_API_KEY;
const NEWSAPI_KEY = process.env.NEWSAPI_API_KEY;

// Helper function to fetch and normalize data from each API
const fetchData = async (url, normalizer) => {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`Error from ${url}: ${response.statusText}`);
            return [];
        }
        const data = await response.json();
        return normalizer(data);
    } catch (error) {
        console.error(`Failed to fetch from ${url}:`, error);
        return [];
    }
};

// Normalizer functions for each API structure
const normalizeNewsAPI = (data) => data.articles?.map(a => ({
    title: a.title,
    url: a.url,
    imageUrl: a.urlToImage || 'https://via.placeholder.com/400x225.png?text=Image+Not+Found',
    source: a.source.name
})) || [];

const normalizeGNews = (data) => data.articles?.map(a => ({
    title: a.title,
    url: a.url,
    imageUrl: a.image || 'https://via.placeholder.com/400x225.png?text=Image+Not+Found',
    source: a.source.name
})) || [];

const normalizeNewsData = (data) => data.results?.map(a => ({
    title: a.title,
    url: a.link,
    imageUrl: a.image_url || 'https://via.placeholder.com/400x225.png?text=Image+Not+Found',
    source: a.source_id
})) || [];

const normalizeMediastack = (data) => data.data?.map(a => ({
    title: a.title,
    url: a.url,
    imageUrl: a.image || 'https://via.placeholder.com/400x225.png?text=Image+Not+Found',
    source: a.source
})) || [];


exports.handler = async function(event, context) {
    const category = event.queryStringParameters.category || 'general';
    
    // Define API endpoints with category parameter
    const endpoints = [
        { url: `https://newsapi.org/v2/top-headlines?country=us&category=${category}&apiKey=${NEWSAPI_KEY}`, normalizer: normalizeNewsAPI },
        { url: `https://gnews.io/api/v4/top-headlines?lang=en&topic=${category === 'general' ? 'breaking-news' : category}&token=${GNEWS_KEY}`, normalizer: normalizeGNews },
        { url: `https://newsdata.io/api/1/news?language=en&category=${category}&apikey=${NEWSDATA_KEY}`, normalizer: normalizeNewsData },
        { url: `http://api.mediastack.com/v1/news?access_key=${MEDIASTACK_KEY}&languages=en&categories=${category}`, normalizer: normalizeMediastack }
    ];

    const promises = endpoints.map(api => fetchData(api.url, api.normalizer));
    const results = await Promise.all(promises);
    
    // Flatten the array of arrays into a single array of articles
    const allArticles = results.flat();

    return {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': '*', // Allow requests from your site
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(allArticles),
    };
};
