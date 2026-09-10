const API_HOST = 'https://modellus-api.interactivebook.workers.dev';
const API_GLOB = `**/${API_HOST.replace(/^https:\/\//, '')}/**`;

module.exports = { API_HOST, API_GLOB };
