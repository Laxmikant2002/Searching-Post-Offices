// Geoapify API key (provided by user)
const API_KEY = '566f0b1a94ab4444aacc2f73407083da';

const ipDisplay = document.getElementById('ipDisplay');
const getStartedBtn = document.getElementById('getStartedBtn');
const details = document.getElementById('details');
const ipAddressSmall = document.getElementById('ipAddressSmall');
const latEl = document.getElementById('lat');
const lonEl = document.getElementById('lon');
const cityEl = document.getElementById('city');
const regionEl = document.getElementById('region');
const orgEl = document.getElementById('org');
const hostnameEl = document.getElementById('hostname');
const mapImg = document.getElementById('map');
const timezoneEl = document.getElementById('timezone');
const timeDisplay = document.getElementById('timeDisplay');
const pincodeEl = document.getElementById('pincode');
const messageEl = document.getElementById('message');
const postOfficesContainer = document.getElementById('postOfficesContainer');
const searchInput = document.getElementById('search');

let CURRENT = {
  ip: null,
  lat: null,
  lon: null,
  timezone: null,
  pincode: null,
  postOffices: []
};

// Step 1: Get user's IP address on load
async function fetchClientIP(){
  try{
    // Use ipify service to get client IP
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    const ip = data.ip;
    CURRENT.ip = ip;
    ipDisplay.textContent = ip;
    ipAddressSmall.textContent = ip;
  }catch(err){
    console.error('Failed to fetch IP', err);
    ipDisplay.textContent = 'Unavailable';
  }
}

// Step 2: Fetch user info using ipinfo (evaluation requires ipinfo.io)
async function fetchUserInfo(ip){
  try{
    // ipinfo provides lat/lon in a 'loc' field as "lat,lon"
    const url = `https://ipinfo.io/${ip}/geo`;
    const res = await fetch(url);
    if(!res.ok) throw new Error('ipinfo failed');
    const info = await res.json();
    return info;
  }catch(err){
    console.error('Failed to fetch user info', err);
    throw err;
  }
}

// Step 3: Show map using Geoapify Static Maps API
function updateMap(lat, lon){
  // Set Google Maps iframe with marker using the maps.google.com URL format
  // This uses an embedded map with a pin centered at the lat/lon.
  const mapFrame = document.getElementById('mapFrame');
  const geoImg = document.getElementById('geoImg');

  // Google Maps embed with q parameter for marker. Note: No API key required for a simple embed iframe.
  const gsrc = `https://maps.google.com/maps?q=${lat},${lon}&z=15&output=embed`;
  mapFrame.src = gsrc;

  // Also prepare Geoapify static map as a fallback/display when needed
  const staticSrc = `https://maps.geoapify.com/v1/staticmap?&center=${lat},${lon}&zoom=13&size=1200x600&marker=icon:large-red-cutout|${lat},${lon}&apiKey=${API_KEY}`;
  geoImg.src = staticSrc;
}

// Step 4: Display current time in user's timezone
function updateTimeForTimezone(tz){
  timezoneEl.textContent = tz || 'Unknown';
  if(!tz) return;
  // Update time every second
  function tick(){
    const now = new Date();
    // Use Intl to get time in zone
    const fmt = new Intl.DateTimeFormat([], {
      timeZone: tz,
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      year: 'numeric', month: 'short', day: 'numeric'
    });
    timeDisplay.textContent = fmt.format(now);
  }
  tick();
  setInterval(tick, 1000);
}

// Step 5: Fetch post offices by pincode
async function fetchPostOffices(pincode){
  try{
    const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
    const arr = await res.json();
    if(!Array.isArray(arr) || arr.length === 0) return [];
    const data = arr[0];
    if(data.Status !== 'Success') return [];
    return data.PostOffice || [];
  }catch(err){
    console.error('Failed to fetch post offices', err);
    return [];
  }
}

function renderPostOffices(list){
  postOfficesContainer.innerHTML = '';
  if(!list || list.length === 0){
    postOfficesContainer.innerHTML = '<div style="color:var(--muted)">No post offices found.</div>';
    return;
  }
  list.forEach(po =>{
    const div = document.createElement('div');
    div.className = 'office-card';
    div.innerHTML = `
      <h4>${po.Name}</h4>
      <p>Branch Type: ${po.BranchType}</p>
      <p>Delivery Status: ${po.DeliveryStatus}</p>
      <p>District: ${po.District}</p>
      <p>Division: ${po.Division}</p>
    `;
    postOfficesContainer.appendChild(div);
  })
}

// Step 6: Search filter
function setupSearch(){
  searchInput.addEventListener('input', ()=>{
    const q = searchInput.value.trim().toLowerCase();
    const filtered = CURRENT.postOffices.filter(p =>
      p.Name.toLowerCase().includes(q) || (p.BranchType||'').toLowerCase().includes(q)
    );
    renderPostOffices(filtered);
  });
}

// Wire up Get Started
getStartedBtn.addEventListener('click', async ()=>{
  if(!CURRENT.ip) return alert('IP not available');
  getStartedBtn.disabled = true;
  getStartedBtn.textContent = 'Loading...';
  try{
    const info = await fetchUserInfo(CURRENT.ip);
    // Fill details
    CURRENT.lat = info.latitude || info.lat || info.location?.latitude;
    CURRENT.lon = info.longitude || info.lon || info.location?.longitude;
    CURRENT.timezone = info.timezone || info.time_zone || info.timezone;
    CURRENT.pincode = info.postal || info.postcode || info.postal_code || info.postal_code;

    latEl.textContent = CURRENT.lat || 'N/A';
    lonEl.textContent = CURRENT.lon || 'N/A';
    cityEl.textContent = info.city || info.city_name || 'N/A';
    regionEl.textContent = info.region || info.region_name || 'N/A';
    orgEl.textContent = info.org || info.org_name || 'N/A';
    hostnameEl.textContent = info.hostname || 'N/A';

    pincodeEl.textContent = CURRENT.pincode || 'N/A';

    // Map
    if(CURRENT.lat && CURRENT.lon){
      updateMap(CURRENT.lat, CURRENT.lon);
    }

    // Timezone
    updateTimeForTimezone(CURRENT.timezone);

    // Post offices
    if(CURRENT.pincode){
      const posts = await fetchPostOffices(CURRENT.pincode);
      CURRENT.postOffices = posts;
      renderPostOffices(posts);
      messageEl.textContent = `Number of pincode(s) found: ${posts.length}`;
    }else{
      messageEl.textContent = 'Pincode not available from IP API.';
    }

    details.classList.remove('hidden');
  }catch(err){
    alert('Failed to load data. See console for details.');
  }finally{
    getStartedBtn.disabled = false;
    getStartedBtn.textContent = 'Get Started';
  }
});

// Init
fetchClientIP();
setupSearch();
