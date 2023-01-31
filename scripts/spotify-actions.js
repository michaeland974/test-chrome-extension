const getTrack = async (id, accessToken) => {
    const requestTrack = await fetch(`https://api.spotify.com/v1/tracks/${id}`,{
        method: 'GET',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${accessToken}`
        },
        json: true
    })
    const response = await requestTrack.json();
    return response; 
}

const getPlaylists = async (accessToken) => {
      const requestPlaylists = await fetch(`https://api.spotify.com/v1/me/playlists`,{
          method: 'GET',
          headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Authorization': `Bearer ${accessToken}`
          },
          json: true
      })
      const response = await requestPlaylists.json();
      return response;
}

const getSavedTracks = async (accessToken) => {
      const requestSavedTracks = await fetch(`https://api.spotify.com/v1/me/tracks/`,{
          method: 'GET',
          headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Authorization': `Bearer ${accessToken}`
          },
          json: true
      })
      const response = await requestSavedTracks.json();
      return response; 
}

export const saveTrack = async (id, accessToken) => {
      const saveTrackRequest = await fetch(`https://api.spotify.com/v1/me/tracks?ids=${id}`,{
          method: 'PUT',
          headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Authorization': `Bearer ${accessToken}`
          },
          json: true
      })
      const response = saveTrackRequest;
      return response 
}

export const searchTrackFirstTrack = async(trackName, accessToken) => {
    const url = `https://api.spotify.com/v1/search?q=track${trackName}&type=track&limit=10`
    const search_track = await fetch(url,{
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        },
        json: true
    })
    const response = await search_track.json();
    const firstTrack = response.tracks.items[0];
    return firstTrack; 
}