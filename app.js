// --- VARIABLES GLOBALS ---
let latSelected = null;
let lonSelected = null;
let fotoBase64 = null; 
let marcador = null;
let map = null;

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. INICIALITZACIÓ DEL MAPA ---
    // Centrat al Pirineu amb zoom 8
    map = L.map('map').setView([42.400, 1.500], 8);

    L.tileLayer('https://geoserveis.icgc.cat/servei/catalunya/mapa-base/wmts/topografic/MON3857NW/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© ICGC'
    }).addTo(map);

    // Evita el bug del mapa gris
    setTimeout(() => { map.invalidateSize(); }, 500);

    // --- 2. FUNCIONALITAT DE MARCADORS ---
    function updateMarker(lat, lon, label = "Ubicació de l'allau") {
        latSelected = lat;
        lonSelected = lon;
        document.getElementById('coords-info').innerHTML = `✅ Lat: <strong>${lat.toFixed(5)}</strong>, Lon: <strong>${lon.toFixed(5)}</strong>`;
        
        if (marcador) map.removeLayer(marcador);
        marcador = L.marker([lat, lon], {draggable: true}).addTo(map).bindPopup(label).openPopup();
        
        marcador.on('dragend', function(e) {
            const pos = marcador.getLatLng();
            updateMarker(pos.lat, pos.lng, "Ubicació ajustada");
        });
    }

    // Clic al mapa
    map.on('click', function(e) {
        updateMarker(e.latlng.lat, e.latlng.lng, "Marcat manualment");
    });

    // --- 3. BOTONS DE GEOLOCALITZACIÓ ---
    // Botó principal (A sota del mapa)
    document.getElementById('btn-gps').addEventListener('click', () => {
        const infoDiv = document.getElementById('coords-info');
        if (!navigator.geolocation) return;
        infoDiv.innerText = "Buscant satèl·lits... 🛰️";
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                map.setView([lat, lon], 15);
                updateMarker(lat, lon, "La meva posició GPS");
            },
            (error) => { infoDiv.innerHTML = `<span style='color:red;'>Error de GPS.</span>`; },
            { enableHighAccuracy: true, timeout: 60000 }
        );
    });

    // Botó Diana flotant (A sobre del mapa)
    document.getElementById('btn-map-gps').addEventListener('click', (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-map-gps');
        if (!navigator.geolocation) return;
        
        btn.innerText = "⏳"; // Indicador de càrrega
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                map.setView([position.coords.latitude, position.coords.longitude], 14); 
                btn.innerText = "🎯"; 
            },
            (error) => { alert("Error al centrar el mapa."); btn.innerText = "🎯"; },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    });

    // --- 4. GESTIÓ FOTOGRÀFICA ---
    document.getElementById('input-foto').addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                fotoBase64 = e.target.result; 
                const preview = document.getElementById('preview-foto');
                preview.src = fotoBase64;
                preview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });

    // --- 5. GUARDAR A LOCALFORAGE ---
    document.getElementById('btn-guardar').addEventListener('click', async () => {
        const lloc = document.getElementById('input-lloc').value;
        const mida = document.getElementById('input-mida').value;
        const tipus = document.getElementById('input-tipus').value;
        const comentaris = document.getElementById('input-comentaris').value;

        if (latSelected === null) { alert("Toca el mapa o usa el GPS per situar l'allau."); return; }
        if (lloc === "") { alert("Escriu el nom del sector."); return; }
        if (fotoBase64 === null) { alert("Fes una fotografia de l'allau."); return; }

        const novaAllau = {
            lloc, mida, tipus, comentaris,
            lat: latSelected, lon: lonSelected, foto: fotoBase64,
            data: new Date().toLocaleString()
        };

        const dades = await localforage.getItem('allaus_pendents') || [];
        dades.push(novaAllau);
        await localforage.setItem('allaus_pendents', dades); 

        // Netejar form
        document.getElementById('input-lloc').value = "";
        document.getElementById('input-comentaris').value = "";
        document.getElementById('input-mida').selectedIndex = 0;
        document.getElementById('input-tipus').selectedIndex = 0;
        latSelected = null; lonSelected = null; fotoBase64 = null;
        document.getElementById('coords-info').innerText = "🗺️ Cap ubicació seleccionada";
        document.getElementById('preview-foto').style.display = 'none';
        if (marcador) map.removeLayer(marcador);
        
        carregarDadesLocals();
        alert("✅ Guardat al telèfon amb èxit!");
    });

    // --- 6. RENDERITZAR I SINCRONITZAR ---
    async function carregarDadesLocals() {
        const dades = await localforage.getItem('allaus_pendents') || [];
        const llistaRegistres = document.getElementById('llista-registres');
        const btnSync = document.getElementById('btn-sync');
        
        llistaRegistres.innerHTML = '';
        
        dades.forEach((allau, index) => {
            const comentariTxt = allau.comentaris ? `<br><em style="color:#777">"${allau.comentaris}"</em>` : '';
            llistaRegistres.innerHTML += `
                <div class="registre">
                    <img src="${allau.foto}" alt="Miniatura">
                    <div class="info-txt">
                        <strong>#${index + 1} - ${allau.lloc}</strong>
                        <span>${allau.mida || '-'} | ${allau.tipus || '-'}</span>
                        ${comentariTxt}
                    </div>
                </div>
            `;
        });

        document.getElementById('comptador').innerText = dades.length;
        btnSync.style.display = dades.length > 0 ? 'block' : 'none';
        if (dades.length === 0) llistaRegistres.innerHTML = '<p style="color:gray; font-size:13px; text-align:center;">No tens registres pendents.</p>';
    }

    // Aquí enviem a Python
    document.getElementById('btn-sync').addEventListener('click', async () => {
        if (!navigator.onLine) { alert("❌ No tens internet per sincronitzar."); return; }
        
        const btnSync = document.getElementById('btn-sync');
        const dades = await localforage.getItem('allaus_pendents') || [];
        
        btnSync.innerText = "⏳ Enviant dades...";
        
        try {
            // ATENCIÓ: Posa aquí la IP local del teu ordinador!
            const resposta = await fetch('http://192.168.1.33:8000/enviar-allau', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dades)
            });

            if (resposta.ok) {
                await localforage.removeItem('allaus_pendents');
                carregarDadesLocals();
                alert("🚀 Dades enviades a la base de dades UPAN!");
            } else {
                alert("⚠️ Error: El servidor Python ha rebutjat les dades.");
            }
        } catch (error) {
            alert("❌ Error de connexió amb el servidor. Està encès?");
        } finally {
            btnSync.innerText = "📡 Sincronitzar amb servidor";
        }
    });

    carregarDadesLocals();

    // --- 7. REGISTRE DEL SERVICE WORKER ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(() => console.log('Service Worker Registrat!'))
                .catch(err => console.log('Error al SW: ', err));
        });
    }

});
