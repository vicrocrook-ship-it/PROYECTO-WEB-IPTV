const video = document.getElementById('video');
const playlistUI = document.getElementById('playlist');
const searchInput = document.getElementById('search');
const serverInput = document.getElementById('server-url');
const btnCargar = document.getElementById('btn-cargar');
let canales = [];

// Cargar automáticamente la lista si ya se guardó antes
document.addEventListener('DOMContentLoaded', () => {
    const listaGuardada = localStorage.getItem('ultima_lista_iptv');
    if (listaGuardada) {
        serverInput.value = listaGuardada;
        cargarIPTV(listaGuardada);
    }
});

// Escuchar el botón de carga
btnCargar.addEventListener('click', () => {
    const urlUptv = serverInput.value.trim();
    if (urlUptv) {
        localStorage.setItem('ultima_lista_iptv', urlUptv);
        cargarIPTV(urlUptv);
    } else {
        alert("Por favor, ingresa una URL válida.");
    }
});

// Obtener el archivo m3u de tu servidor
async function cargarIPTV(url) {
    try {
        playlistUI.innerHTML = '<div class="status-msg">Descargando canales desde tu servidor...</div>';
        const respuesta = await fetch(url);
        if (!respuesta.ok) throw new Error("No se pudo conectar al servidor.");
        const texto = await respuesta.text();
        canales = parsearM3U(texto);
        if (canales.length === 0) {
            playlistUI.innerHTML = '<div class="status-msg" style="color: red;">No se encontraron canales válidos.</div>';
        } else {
            renderizarLista(canales);
        }
    } catch (error) {
        playlistUI.innerHTML = `
            <div class="status-msg" style="color: red;">
                Error al conectar con la lista.<br>
                Verifica la URL o el acceso CORS de tu servidor.
            </div>`;
        console.error("Error IPTV:", error);
    }
}

// Analizador del formato M3U
function parsearM3U(texto) {
    const lineas = texto.split('\n');
    const resultado = [];
    let canalActual = null;
    lineas.forEach(linea => {
        linea = linea.trim();
        if (linea.startsWith('#EXTINF:')) {
            const partes = linea.split(',');
            const nombre = partes[partes.length - 1] || "Canal sin nombre";
            canalActual = { nombre: nombre };
        } else if (linea.startsWith('http') && canalActual) {
            canalActual.url = linea;
            resultado.push(canalActual);
            canalActual = null; 
        }
    });
    return resultado;
}

// Mostrar los canales en pantalla
function renderizarLista(lista) {
    playlistUI.innerHTML = "";
    lista.forEach(canal => {
        const li = document.createElement('li');
        li.textContent = canal.nombre;
        li.addEventListener('click', () => {
            document.querySelectorAll('#playlist li').forEach(el => el.classList.remove('active'));
            li.classList.add('active');
            reproducirCanal(canal.url);
        });
        playlistUI.appendChild(li);
    });
}

// Activar la transmisión de video HLS
function reproducirCanal(url) {
    if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            video.play().catch(e => console.log("Reproducción automática pausada."));
        });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url;
        video.addEventListener('loadedmetadata', () => video.play());
    } else {
        alert("Tu navegador no soporta streaming HLS.");
    }
}

// Buscador en tiempo real
searchInput.addEventListener('input', (e) => {
    const busqueda = e.target.value.toLowerCase();
    const filtrados = canales.filter(c => c.nombre.toLowerCase().includes(busqueda));
    renderizarLista(filtrados);
});
