let latSelected = null;
let lonSelected = null;
let fotoBase64 = null; 
let marcador = null;

// 1. INICIALITZAR EL MAPA
const map = L.map('map').setView([42.633, 0.822], 10); // Centrat a la Val d'Aran / Pirineu

// Utilitzem OpenStreetMap com a base súper fiable per a les proves
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, 
    attribution: '© OpenStreetMap'
}).addTo(map);

// AQUESTA LÍNIA ÉS MÀGICA: Evita que el mapa quedi gris per culpa del CSS
setTimeout(() => { map.invalidateSize(); }, 500);


// 2. FUNCIÓ PER ACTUALIZZAR EL PUNT AL MAPA
function updateMarker(lat, lon, label = "Ubicació de l'allau") {
    latSelected = lat;
    lonSelected = lon;
    document.getElementById('coords-info').innerText = `✅ Lat: ${lat.toFixed(5)} | Lon: ${lon.toFixed(5)}`;
    
    if (marcador) map.removeLayer(marcador);
    marcador = L.marker([lat, lon], {draggable: true}).addTo(map).bindPopup(label).openPopup();
    
    marcador.on('dragend', function(e) {
        const pos = marcador.getLatLng();
        updateMarker(pos.lat, pos.lng);
    });
}

// 3. EVENTS DEL MAPA I GPS
map.on('click', function(e) {
    updateMarker(e.latlng.lat, e.latlng.lng, "Ubicació marcada manualment");
});

document.getElementById('btn-gps').addEventListener('click', () => {
    if (!navigator.geolocation) { alert("GPS no compatible."); return; }
    
    document.getElementById('coords-info').innerText = "Buscant senyal GPS... 🛰️";
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            map.setView([latitude, longitude], 15);
            updateMarker(latitude, longitude, "La meva posició GPS");
        }, 
        (error) => { alert("No s'ha pogut obtenir el GPS."); },
        { enableHighAccuracy: true }
    );
});

// 4. GESTIÓ DE LA FOTOGRAFIA
document.getElementById('input-foto').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            fotoBase64 = event.target.result;
            const preview = document.getElementById('preview-foto');
            preview.src = fotoBase64;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
});

// 5. GUARDAR A LA BASE DE DADES OFFLINE (LocalForage)
document.getElementById('btn-guardar').addEventListener('click', async () => {
    const lloc = document.getElementById('input-lloc').value;
    
    if (!latSelected || !lloc || !fotoBase64) {
        alert("⚠️ Falten dades. Comprova que has marcat el mapa, escrit el lloc i fet la foto.");
        return;
    }

    const report = {
        lloc,
        mida: document.getElementById('input-mida').value,
        tipus: document.getElementById('input-tipus').value,
        comentaris: document.getElementById('input-comentaris').value,
        lat: latSelected,
        lon: lonSelected,
        foto: fotoBase64,
        timestamp: new Date().toISOString()
    };

    const pendents = await localforage.getItem('allaus_pendents') || [];
    pendents.push(report);
    await localforage.setItem('allaus_pendents', pendents);
    
    alert("✅ Registre guardat al dispositiu correctament!");
    
    // Netejem el formulari després de guardar
    document.getElementById('input-lloc').value = '';
    document.getElementById('input-comentaris').value = '';
    document.getElementById('preview-foto').style.display = 'none';
    if (marcador) map.removeLayer(marcador);
    latSelected = null; lonSelected = null; fotoBase64 = null;
    document.getElementById('coords-info').innerText = "🗺️ Cap ubicació seleccionada";
    
    renderList();
});

// 6. RENDERITZAR LLISTA I SINCRONITZAR AMB PYTHON
async function renderList() {
    const pendents = await localforage.getItem('allaus_pendents') || [];
    const container = document.getElementById('llista-registres');
    const comptador = document.getElementById('comptador');
    const btnSync = document.getElementById('btn-sync');
    
    comptador.innerText = pendents.length;
    container.innerHTML = pendents.length === 0 ? '<p style="font-size:12px; color:#999; text-align:center;">No hi ha registres pendents.</p>' : '';
    
    if(pendents.length > 0) btnSync.style.display = 'block';
    else btnSync.style.display = 'none';

    pendents.forEach(item => {
        container.innerHTML += `
            <div class="registre">
                <img src="${item.foto}">
                <div class="info-txt">
                    <strong>${item.lloc}</strong>
                    <span>${item.mida || '-'} | ${item.tipus || '-'}</span>
                </div>
            </div>
        `;
    });
}

// Botó per enviar-ho al teu ordinador (MIRA DE POSAR LA TEVA IP LOCAL AQUÍ!)
document.getElementById('btn-sync').addEventListener('click', async () => {
    const pendents = await localforage.getItem('allaus_pendents') || [];
    if (pendents.length === 0) return;

    try {
        // CANVIA LA IP PER LA TEVA (ex: 192.168.1.33)
        const resposta = await fetch('http://localhost:8000/enviar-allau', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pendents)
        });

        if (resposta.ok) {
            await localforage.removeItem('allaus_pendents');
            alert("🚀 Dades sincronitzades amb èxit!");
            renderList();
        } else {
            alert("⚠️ Error en connectar amb el servidor Python.");
        }
    } catch (error) {
        alert("❌ Error de connexió: Assegura't que Python està encès i que poses la IP correcta.");
    }
});

// Dibuixar la llista en obrir la pàgina
renderList();
