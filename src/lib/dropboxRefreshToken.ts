export async function getDropboxAccessToken() {
  const response = await fetch('/api/dropbox-token');
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Failed to refresh Dropbox token');
  }
  
  return data.access_token;
}