// Dins de app.js
let latSelected = null;
let lonSelected = null;
let marcador = null;

const map = L.map('map').setView([42.3, 1.8], 9);
L.tileLayer('...').addTo(map);

function updateMarker(lat, lon) {
    latSelected = lat;
    lonSelected = lon;
    document.getElementById('coords-info').innerText = `✅ Lat: ${lat.toFixed(5)} | Lon: ${lon.toFixed(5)}`;
    
    if (marcador) map.removeLayer(marcador);
    marcador = L.marker([lat, lon], {draggable: true}).addTo(map);
    
    // Per si l'usuari vol ajustar el punt arrossegant-lo
    marcador.on('dragend', function(e) {
        const pos = marcador.getLatLng();
        updateMarker(pos.lat, pos.lng);
    });
}

// 1. Clicar al mapa
map.on('click', function(e) {
    updateMarker(e.latlng.lat, e.latlng.lng);
});

// 2. Botó GPS
document.getElementById('btn-gps').addEventListener('click', () => {
    navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;
        map.setView([latitude, longitude], 15);
        updateMarker(latitude, longitude);
    });
});
