// Create video modal
const videoModal = document.createElement('div');
videoModal.className = 'video-modal';
videoModal.innerHTML = `
  <div class="modal-content">
    <div class="modal-header">
      <h2 id="modalTitle"></h2>
      <button class="close-modal">&times;</button>
    </div>
    <div class="modal-body">
      <div class="video-container" id="videoContainer"></div>
      <div class="episodes-container" id="episodesContainer">
        <div class="seasons-list" id="seasonsList"></div>
        <div class="episodes-list" id="episodesList"></div>
      </div>
    </div>
  </div>
`;
document.body.appendChild(videoModal);

// Loading indicator
const loadingIndicator = document.createElement('div');
loadingIndicator.className = 'loading-indicator hidden';
loadingIndicator.innerHTML = '<div class="spinner"></div>';
document.body.appendChild(loadingIndicator);

function showLoading() {
  loadingIndicator.classList.remove('hidden');
}

function hideLoading() {
  loadingIndicator.classList.add('hidden');
}

function showError(message, duration = 3000) {
  const error = document.createElement('div');
  error.className = 'error-message';
  error.textContent = message;
  document.body.appendChild(error);
  setTimeout(() => {
    error.classList.add('fade-out');
    setTimeout(() => error.remove(), 300);
  }, duration);
}

// Create a card for a movie or series
function createCard(item) {
  const card = document.createElement('div');
  card.className = 'card';
  
  card.innerHTML = `
    <div class="card-poster">
      <img src="${item.poster}" alt="${item.title}" loading="lazy">
      <div class="card-overlay">
        <button class="play-button">
          <span class="material-icons">play_arrow</span>
        </button>
      </div>
    </div>
    <div class="card-info">
      <h3 class="card-title">${item.title}</h3>
      <div class="card-meta">
        <span class="year">${item.year}</span>
        <span class="type">${item.type === 'series' ? 'Série' : 'Film'}</span>
      </div>
      <p class="card-desc">${item.description}</p>
    </div>
  `;

  // Add click handler
  card.querySelector('.play-button').addEventListener('click', () => {
    playVideo(item);
  });

  return card;
}

// Display episodes for a series
function displayEpisodes(series, seasonIndex = 0) {
  const episodesContainer = document.getElementById('episodesContainer');
  const seasonsList = document.getElementById('seasonsList');
  const episodesList = document.getElementById('episodesList');
  
  // Show episodes container for series
  episodesContainer.style.display = series.seasons && series.seasons.length > 0 ? 'flex' : 'none';
  
  if (!series.seasons || series.seasons.length === 0) {
    return;
  }

  const seasons = series.seasons;

  // Create season buttons
  seasonsList.innerHTML = seasons.map((season, index) => `
    <button class="season-btn ${index === seasonIndex ? 'active' : ''}" data-season="${season.number}">
      ${season.title}
    </button>
  `).join('');

  // Show episodes for selected season
  const selectedSeason = seasons[seasonIndex];
  const episodes = selectedSeason.episodes;
  
  episodesList.innerHTML = episodes.map(ep => {
    const watched = isEpisodeWatched(series.title, selectedSeason.number, ep.number);
    return `
      <div class="episode-item ${watched ? 'watched' : ''}" data-episode="${ep.number}">
        <div class="ep-number">${ep.number}</div>
        <div class="ep-info">
          <div class="ep-title">${ep.title}</div>
          <div class="ep-duration">${ep.duration}</div>
          <div class="ep-desc">${ep.description || ''}</div>
        </div>
        <button class="play-btn" data-link="${ep.link}">
          <span class="material-icons">play_arrow</span>
        </button>
      </div>
    `;
  }).join('');

  // Add event listeners
  seasonsList.querySelectorAll('.season-btn').forEach((btn, index) => {
    btn.addEventListener('click', () => {
      seasonsList.querySelector('.active')?.classList.remove('active');
      btn.classList.add('active');
      displayEpisodes(series, index);
    });
  });

  episodesList.querySelectorAll('.episode-item').forEach(item => {
    const playBtn = item.querySelector('.play-btn');
    playBtn.addEventListener('click', () => {
      const link = playBtn.dataset.link;
      const epNumber = item.dataset.episode;
      const epTitle = item.querySelector('.ep-title').textContent;
      
      // Mark as watched before playing
      item.classList.add('watched');
      const epId = `${series.title}_s${selectedSeason}e${epNumber}`;
      const watched = JSON.parse(localStorage.getItem('watchedEpisodes') || '{}');
      watched[epId] = true;
      localStorage.setItem('watchedEpisodes', JSON.stringify(watched));
      
      // Play the episode
      playVideo({
        title: `${series.title} - Episode ${epNumber}`,
        link: link
      });
    });
  });
}

// Handle video playback
function playVideo(item) {
  const videoContainer = document.getElementById('videoContainer');
  const modalTitle = document.getElementById('modalTitle');
  const episodesContainer = document.getElementById('episodesContainer');
  
  modalTitle.textContent = item.title;
  videoModal.classList.add('active');

  // Clear previous content
  videoContainer.innerHTML = '';

  // Show loading
  showLoading();

  // Handle episodes display
  if (item.type === 'series') {
    episodesContainer.style.display = 'flex';
    displayEpisodes(item);
  } else {
    episodesContainer.style.display = 'none';
  }

  if (item.link && item.link.includes('uqload')) {
    // External video (uqload)
    let embedUrl = item.link;
    if (!embedUrl.includes('embed-')) {
      const parts = embedUrl.split('/')
      const id = parts[parts.length-1].replace('.html','')
      embedUrl = `https://uqload.cx/embed-${id}.html`
    }
    
    const iframe = document.createElement('iframe');
    iframe.src = embedUrl;
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('marginwidth', '0');
    iframe.setAttribute('marginheight', '0');
    iframe.setAttribute('scrolling', 'no');
    iframe.style.width = '100%';
    iframe.style.height = '100%';

    // Add error and load handlers
    iframe.onload = () => {
      hideLoading();
    };
    
    iframe.onerror = () => {
      hideLoading();
      showError('Erreur de chargement de la vidéo');
    };

    videoContainer.appendChild(iframe);
  } else if (item.link) {
    // Local video
    const video = document.createElement('video');
    video.src = item.link;
    video.controls = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('autoplay', '');
    
    video.onloadedmetadata = () => {
      hideLoading();
    };
    
    video.onerror = () => {
      hideLoading();
      showError('Erreur de chargement de la vidéo');
    };
    
    videoContainer.appendChild(video);
  } else {
    hideLoading();
    showError('Aucune source vidéo disponible');
  }
}

// Close modal when clicking the close button or outside the modal
videoModal.querySelector('.close-modal').addEventListener('click', () => {
  videoModal.classList.remove('active');
  const videoContainer = document.getElementById('videoContainer');
  videoContainer.innerHTML = ''; // Stop video playback
});

videoModal.addEventListener('click', (e) => {
  if (e.target === videoModal) {
    videoModal.classList.remove('active');
    const videoContainer = document.getElementById('videoContainer');
    videoContainer.innerHTML = ''; // Stop video playback
  }
});

// Search functionality
let catalog = [];

function updateSearch(event) {
  const searchInput = event.target;
  const searchResults = document.getElementById('searchResults');
  const container = document.getElementById('results');
  const query = searchInput.value.toLowerCase().trim();
  
  // Show/hide search results based on input
  if (query.length > 0) {
    searchResults.classList.add('active');
  } else {
    searchResults.classList.remove('active');
    return;
  }
  
  container.innerHTML = '';
  
  const results = catalog.filter(item => 
    item.title.toLowerCase().includes(query) ||
    item.description.toLowerCase().includes(query)
  );
  
  if (results.length === 0) {
    container.innerHTML = '<div class="no-results">Aucun résultat trouvé</div>';
    return;
  }
  
  results.forEach(item => {
    container.appendChild(createCard(item));
  });
}

// Load catalog from data.json
async function loadCatalog() {
  showLoading();
  try {
    const response = await fetch('data.json');
    if (!response.ok) {
      throw new Error('Erreur lors du chargement du catalogue');
    }
    const data = await response.json();
    
    // Update catalog
    catalog = data.items || [];
    
    // Update hero with first item
    if (catalog.length > 0) {
      const heroItem = catalog[0];
      const heroBig = document.getElementById('heroBig');
      const heroTitle = document.getElementById('heroTitle');
      const heroDesc = document.getElementById('heroDesc');
      const heroPlay = document.getElementById('heroPlay');

      heroBig.style.backgroundImage = `linear-gradient(to bottom, rgba(20,20,20,0) 0%, var(--bg) 100%), url('${heroItem.backdrop}')`;
      heroTitle.textContent = heroItem.title;
      heroDesc.textContent = heroItem.description;
      
      heroPlay.onclick = () => playVideo(heroItem);
    }
    
    // Split catalog into categories
    const series = catalog.filter(item => item.type === 'series');
    const movies = catalog.filter(item => item.type === 'movie');
    
    // Update rows
    const rowAll = document.getElementById('rowAll');
    const rowMyList = document.getElementById('rowMyList');
    const rowResume = document.getElementById('rowResume');
    
    // Afficher toutes les vidéos
    rowAll.innerHTML = '';
    catalog.forEach(item => {
      rowAll.appendChild(createCard(item));
    });

    // Séries en cours (avec épisodes regardés)
    rowResume.innerHTML = '';
    const watchedEpisodes = JSON.parse(localStorage.getItem('watchedEpisodes') || '{}');
    const inProgress = series.filter(series => {
      const seriesKey = Object.keys(watchedEpisodes).find(key => key.startsWith(series.title));
      return seriesKey !== undefined;
    });
    inProgress.forEach(item => {
      rowResume.appendChild(createCard(item));
    });

    // Ma liste (pour l'instant, afficher quelques éléments aléatoires)
    rowMyList.innerHTML = '';
    const myList = catalog.slice(0, 4); // Pour l'exemple
    myList.forEach(item => {
      rowMyList.appendChild(createCard(item));
    });
    
    hideLoading();
  } catch (error) {
    console.error('Error:', error);
    showError('Erreur lors du chargement du catalogue');
    hideLoading();
  }
}

// Check if an episode has been watched
function isEpisodeWatched(seriesTitle, seasonNumber, episodeNumber) {
  const watched = JSON.parse(localStorage.getItem('watchedEpisodes') || '{}');
  const epId = `${seriesTitle}_s${seasonNumber}e${episodeNumber}`;
  return watched[epId] === true;
}

// Mark episode as watched
function markEpisodeAsWatched(seriesTitle, seasonNumber, episodeNumber) {
  const watched = JSON.parse(localStorage.getItem('watchedEpisodes') || '{}');
  const epId = `${seriesTitle}_s${seasonNumber}e${episodeNumber}`;
  watched[epId] = true;
  localStorage.setItem('watchedEpisodes', JSON.stringify(watched));
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Set up search
  const searchInput = document.getElementById('search');
  if (searchInput) {
    searchInput.addEventListener('input', updateSearch);
    
    // Close search results when clicking outside
    document.addEventListener('click', (e) => {
      const searchResults = document.getElementById('searchResults');
      if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
        searchResults.classList.remove('active');
        searchInput.value = '';
      }
    });
  }
  
  // Load catalog
  loadCatalog();
});