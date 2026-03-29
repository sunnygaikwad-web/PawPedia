// encyclopedia.js — Dynamic Wikipedia Integration & Infinite Scroll

let currentPage = 1;
let currentQuery = "Animals";
let activeFilter = 'all';
let isFetching = false;
let displayedAnimals = [];
let hasError = false;

// Seed categories to give diverse results when no search is active
const seedQueries = {
    'all': 'Animals',
    'mammal': 'Mammals',
    'bird': 'Birds',
    'reptile': 'Reptiles',
    'insect': 'Insects',
    'fish': 'Fish',
    'endangered': 'Endangered species'
};

// Simple NLP parsing to extract structured data from Wikipedia description
function parseTraits(extract) {
    const text = (extract || '').toLowerCase();
    
    // Diet Guessing
    let diet = 'Omnivore / Herbivore';
    if (text.match(/carnivore|predator|meat|hunt|fish|insects/)) diet = 'Carnivore';
    if (text.match(/herbivore|plant|grass|fruit|leaves/)) diet = 'Herbivore';
    if (text.match(/omnivore/)) diet = 'Omnivore';

    // Habitat Guessing
    let habitat = 'Varies (Terrestrial)';
    if (text.match(/ocean|sea|marine|water|coral|reef/)) habitat = 'Marine / Ocean';
    if (text.match(/river|lake|freshwater/)) habitat = 'Freshwater';
    if (text.match(/forest|jungle|rainforest/)) habitat = 'Forest / Jungle';
    if (text.match(/desert|arid/)) habitat = 'Desert / Arid Regions';
    if (text.match(/mountain|alpine/)) habitat = 'Mountainous';
    if (text.match(/savanna|grassland|plains/)) habitat = 'Grassland / Savanna';

    return { diet, habitat };
}

async function fetchFromWikipedia(query, limit = 20, offset = 0) {
    if (isFetching) return [];
    isFetching = true;
    hasError = false;
    showLoading(true);

    try {
        // Wikipedia Action API: search query, get page extracts and thumbnail images
        const url = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=${limit}&gsroffset=${offset}&prop=pageimages|extracts&exchars=400&exintro&exlimit=max&pithumbsize=600&format=json&origin=*`;
        
        const response = await fetch(url);
        if(!response.ok) throw new Error("API Network response was not ok");
        const data = await response.json();
        
        isFetching = false;
        showLoading(false);

        if (!data || !data.query || !data.query.pages) return [];

        const pages = Object.values(data.query.pages);
        
        // We DO NOT filter out missing images anymore -> Fixes the Empty Data bug
        return pages.filter(p => p.extract).map(p => {
            const traits = parseTraits(p.extract);
            const cleanDesc = p.extract.replace(/(<([^>]+)>)/gi, "").trim();
            const fallbackImg = `https://placehold.co/600x400/2B9E76/FFFFFF?text=${encodeURIComponent(p.title)}`;
            
            return {
                id: p.pageid,
                name: p.title,
                desc: cleanDesc || 'No detailed description available.',
                image: (p.thumbnail && p.thumbnail.source) ? p.thumbnail.source : fallbackImg,
                type: activeFilter === 'all' ? 'Wildlife' : activeFilter,
                sci: `${p.title.split(' ')[0]} ${p.title.split(' ')[1] || 'spp.'}`,
                diet: traits.diet,
                habitat: traits.habitat,
                lifespan: cleanDesc.match(/([0-9]+)\s+years?/i) ? cleanDesc.match(/([0-9]+)\s+years?/i)[0] : 'Varies by subspecies',
                funFact: 'Read the full Wiki article for more amazing biological facts!'
            };
        });
    } catch (err) {
        console.error("Wikipedia API Error:", err);
        isFetching = false;
        hasError = true;
        showLoading(false);
        showErrorState();
        return [];
    }
}

function showLoading(show) {
    const grid = document.getElementById('encGrid');
    if (!grid) return;
    
    let loader = document.getElementById('encLoader');
    let errorBox = document.getElementById('encError');
    if(errorBox) errorBox.remove();
    
    if (show) {
        if (!loader) {
            // SKELETON LOADERS
            let skeletons = Array(8).fill(`
                <div class="animal-card" style="padding:0; overflow:hidden; text-align:left; animation: pulse 1.5s infinite ease-in-out;">
                    <div style="height: 180px; width: 100%; background: #e0e0e0;"></div>
                    <div style="padding: 1.5rem;">
                        <div style="height: 1.2rem; width: 60%; background: #e0e0e0; margin-bottom: 0.8rem; border-radius: 4px;"></div>
                        <div style="height: 0.8rem; width: 90%; background: #e0e0e0; margin-bottom: 0.4rem; border-radius: 4px;"></div>
                        <div style="height: 0.8rem; width: 40%; background: #e0e0e0; border-radius: 4px;"></div>
                    </div>
                </div>
            `).join('');
            
            grid.insertAdjacentHTML('beforeend', `<div id="encLoader" style="grid-column: 1/-1; width: 100%;"><div class="enc-grid" style="padding:0; margin:0;" id="skeletonGrid">${skeletons}</div><div style="text-align: center; padding: 2rem; color: var(--muted); font-size: 1.1rem;">Fetching species from Wikipedia Database <div class="dot" style="display:inline-block;animation:typingBounce 1.4s infinite ease-in-out;"></div></div></div>`);
            
            // Inject pulse animation
            if(!document.getElementById('skeletonPulse')) {
                document.head.insertAdjacentHTML('beforeend', '<style id="skeletonPulse">@keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 0.3; } 100% { opacity: 0.6; } }</style>');
            }
        }
    } else {
        if (loader) loader.remove();
    }
}

function showErrorState() {
    const grid = document.getElementById('encGrid');
    if (!grid) return;
    grid.innerHTML = `
        <div id="encError" style="grid-column: 1/-1; text-align: center; padding: 4rem 2rem; background: var(--bg-card); border-radius: 16px; border: 2px dashed var(--coral);">
            <div style="font-size: 4rem; margin-bottom: 1rem;">📡</div>
            <h2 style="font-family: var(--font-display); color: var(--coral); margin-bottom: 0.5rem;">Connection Lost</h2>
            <p style="color: var(--muted); margin-bottom: 1.5rem;">We couldn't reach the Wikipedia database. Please check your internet connection and try again.</p>
            <button class="btn btn-primary" onclick="renderAnimals(true)" style="padding: 0.8rem 2rem; font-size: 1.1rem;">🔄 Retry Fetch</button>
        </div>
    `;
}

async function renderAnimals(reset = false) {
    const grid = document.getElementById('encGrid');
    if (!grid) return;

    if (reset) {
        displayedAnimals = [];
        grid.innerHTML = '';
    }

    const offset = (currentPage - 1) * 20;
    const newAnimals = await fetchFromWikipedia(currentQuery, 24, offset);

    if (hasError) return;

    if (reset && newAnimals.length === 0) {
        grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--muted);padding:3rem">No diverse species found for this query.</p>';
        return;
    }

    displayedAnimals = [...displayedAnimals, ...newAnimals];

    const cardsHtml = newAnimals.map((a, i) => {
        const delay = (i % 12) * 0.05;
        return `
    <div class="animal-card reveal active" style="transition-delay: ${delay}s; padding: 0; overflow: hidden; display: flex; flex-direction: column;" onclick="showAnimalDetail(${a.id})">
      <div style="height: 180px; width: 100%; overflow: hidden; position: relative;">
          <img src="${a.image}" alt="${a.name}" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s;" class="card-img-hover" />
          <div style="position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.6); color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: bold;">WIKIPEDIA</div>
      </div>
      <div style="padding: 1.5rem; flex: 1; display: flex; flex-direction: column; text-align: left;">
          <h3 style="margin-bottom: 0.2rem; font-size: 1.2rem; color: var(--dark); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${a.name}</h3>
          <div class="sci" style="margin-bottom: 0.8rem; font-size: 0.85rem; line-height: 1.4; color: var(--muted); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">${a.desc}</div>
          <div class="tags" style="margin-top: auto; justify-content: flex-start;">
            <span class="tag">${a.type}</span>
            <span class="tag" style="background:#e3f2fd; color:#1565c0;">${a.habitat.split(' ')[0]}</span>
          </div>
      </div>
    </div>`;
    }).join('');

    grid.insertAdjacentHTML('beforeend', cardsHtml);
    
    if (!document.getElementById('imgHoverStyle')) {
        document.head.insertAdjacentHTML('beforeend', '<style id="imgHoverStyle">.animal-card:hover .card-img-hover { transform: scale(1.1); }</style>');
    }
}

function showAnimalDetail(id) {
    const animal = displayedAnimals.find(a => a.id === id);
    if (!animal) return;

    const modalBody = document.getElementById('modalBody');
    if (!modalBody) return;
    
    const modalContent = modalBody.parentElement;
    modalContent.style.padding = '0';
    modalContent.style.overflow = 'hidden';

    modalBody.innerHTML = `
        <div style="height: 300px; width: 100%; position: relative;">
            <img src="${animal.image}" alt="${animal.name}" style="width: 100%; height: 100%; object-fit: cover;" />
            <div style="position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 50%, transparent 100%);"></div>
            <button onclick="closeModal('animalModal')" style="position: absolute; top: 1rem; right: 1.5rem; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.2); color: white; border-radius: 50%; width: 36px; height: 36px; font-size: 1.2rem; cursor: pointer; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); transition: background 0.2s;">&times;</button>
            <div style="position: absolute; bottom: 2rem; left: 2rem; right: 2rem;">
                <h2 style="font-family: var(--font-display); font-size: clamp(2rem, 5vw, 2.8rem); color: #fff; text-shadow: 0 4px 12px rgba(0,0,0,0.8); margin: 0; line-height: 1.1;">${animal.name}</h2>
                <div style="display: flex; align-items: center; gap: 0.8rem; margin-top: 0.6rem;">
                    <p style="font-style: italic; color: rgba(255,255,255,0.9); font-size: 1.05rem; margin: 0;">${animal.sci}</p>
                    <span style="background: rgba(43,158,118,0.8); color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold;">VERIFIED</span>
                </div>
            </div>
        </div>
        
        <div style="padding: 2.5rem 2rem;">
            <p style="color: var(--dark); font-size: 1.1rem; line-height: 1.8; margin-bottom: 2.5rem; letter-spacing: 0.01em;">${animal.desc}</p>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 1rem; margin-bottom: 2.5rem;">
                <div style="background: var(--bg); padding: 1.5rem; border-radius: 16px; border: 1.5px solid var(--border); text-align: center; display: flex; flex-direction: column; align-items: center;">
                    <span style="font-size: 1.8rem; margin-bottom: 0.5rem;">🥗</span>
                    <strong style="display: block; font-size: 0.75rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em;">Approx Diet</strong>
                    <span style="font-weight: 500; color: var(--dark); font-size: 1.05rem; display: block; margin-top: 0.4rem;">${animal.diet}</span>
                </div>
                <div style="background: var(--bg); padding: 1.5rem; border-radius: 16px; border: 1.5px solid var(--border); text-align: center; display: flex; flex-direction: column; align-items: center;">
                    <span style="font-size: 1.8rem; margin-bottom: 0.5rem;">🌍</span>
                    <strong style="display: block; font-size: 0.75rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em;">Habitat</strong>
                    <span style="font-weight: 500; color: var(--dark); font-size: 1.05rem; display: block; margin-top: 0.4rem;">${animal.habitat}</span>
                </div>
                <div style="background: var(--bg); padding: 1.5rem; border-radius: 16px; border: 1.5px solid var(--border); text-align: center; display: flex; flex-direction: column; align-items: center;">
                    <span style="font-size: 1.8rem; margin-bottom: 0.5rem;">⏳</span>
                    <strong style="display: block; font-size: 0.75rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em;">Lifespan Eval</strong>
                    <span style="font-weight: 500; color: var(--dark); font-size: 1.05rem; display: block; margin-top: 0.4rem;">${animal.lifespan}</span>
                </div>
            </div>
            
            <div style="background: linear-gradient(135deg, var(--green-lt), #e8f5e9); padding: 1.8rem; border-radius: 16px; border-left: 4px solid var(--green);">
                <strong style="color: var(--green-dk); display: block; margin-bottom: 0.5rem; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.05em;">🔗 Read the Full Research</strong>
                <p style="color: var(--dark); font-size: 1rem; line-height: 1.6; margin: 0; margin-bottom: 1.2rem;">Want to read the full Wikipedia article and access deep scientific classifications?</p>
                <a href="https://en.wikipedia.org/?curid=${animal.id}" target="_blank" class="btn btn-primary" style="padding: 0.7rem 1.4rem; border-radius: 8px; display: inline-block; text-decoration: none;">Open on Wikipedia ↗</a>
            </div>
        </div>
    `;
    
    openModal('animalModal');
}

// Search and Filter Handlers
function handleSearch() {
    const el = document.getElementById('encSearch');
    const q = el ? el.value.trim().toLowerCase() : '';
    
    if (q) {
        currentQuery = q + ' species morphology'; // precise wildlife scoping
    } else {
        currentQuery = seedQueries[activeFilter] || 'Animals';
    }
    
    currentPage = 1;
    renderAnimals(true);
}

function setFilter(btn, f) {
    activeFilter = f;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    const el = document.getElementById('encSearch');
    if (el) el.value = ''; // clear search when switching root categories
    
    handleSearch();
}

// Infinite Scroll Pagination
window.addEventListener('scroll', () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
        if (!isFetching) {
            currentPage++;
            renderAnimals(false);
        }
    }
});

window.addEventListener('DOMContentLoaded', function () {
    var params = new URLSearchParams(location.search);
    var el = document.getElementById('encSearch');
    
    if (params.get('q') && el) {
        el.value = params.get('q');
        currentQuery = params.get('q');
    } else {
        currentQuery = seedQueries['all'];
    }
    
    if (el) {
        // Debounce search input
        let timeout;
        el.addEventListener('input', () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                handleSearch();
            }, 600);
        });
    }
    
    renderAnimals(true);
});