const video = document.getElementById('video');
const playlistUI = document.getElementById('playlist');
const searchInput = document.getElementById('search');
const spinner = document.getElementById('loading-spinner');
const statusText = document.getElementById('status-text');

const serverInput = document.getElementById('xc-server');
const userInput = document.getElementById('xc-user');
const passInput = document.getElementById('xc-pass');
const btnConectar = document.getElementById('btn-conectar');

let canales = [];

document.addEventListener('DOMContentLoaded', () => {
    const loginGuardado = localStorage.getItem('xc_login_data');
    if (loginGuardado) {
        const datos = JSON.parse(loginGuardado);
        serverInput.value = datos.server;
        userInput.value = datos.user;
        passInput.value = datos.pass;
        conectarXtream(datos.server, datos.user, datos.pass);
    }
});

btnConectar.addEventListener('click', () => {
    const server = serverInput.value.trim();
    const user = userInput.value.trim();
    const pass = passInput.value.trim();

    if (server && user && pass) {
        const infoLogin = { server, user, pass };
        localStorage.setItem('xc_login_data', JSON.stringify(infoLogin));
        conectarXtream(server, user, pass);
    } else {
        alert("Por favor, completa todos los campos del panel.");
    }
});

async function conectarXtream(server, user, pass) {
    playlistUI.innerHTML = ""; 
    playlistUI.appendChild(crearElementoEspera());
    
    try {
        // Aseguramos que la URL use 'http' nativo para que el servidor responda correctamente
        let urlBase = server.replace(/\/$/, "");
        if (urlBase.startsWith("https://")) {
            urlBase = urlBase.replace("https://", "http://");
        } else if (!urlBase.startsWith("http://")) {
            urlBase = "http://" + urlBase;
        }
        
        // Generamos la URL de la API de Xtream Codes
        const urlApi = `${urlBase}/player_api.php?username=${user}&password=${pass}&action=get_live_streams`;
        
        // Pasamos la petición por el proxy inverso de 'corsproxy.io' para evadir las restricciones del navegador
        const urlConProxy = `https://corsproxy.io/?${encodeURIComponent(urlApi)}`;

        const respuesta = await fetch(urlConProxy);
        if (!respuesta.ok) throw new Error("Error al conectar con el proxy.");
        
        const datosJson = await respuesta.json();

        if (Array.isArray(datosJson)) {
            canales = datosJson.map(item => ({
                nombre: item.name,
                id: item.stream_id,
                // URL directa del canal en formato contenedor .ts (más compatible en navegadores con reproductores Xtream)
                url: `${urlBase}/live/${user}/${pass}/${item.stream_id}.ts`
            }));

            renderizarLista(canales);
        } else {
            mostrarError("Acceso denegado. Verifica que tu usuario o contraseña no hayan vencido.");
        }

    } catch (error) {
        mostrarError("Error de sincronización. El servidor IPTV no responde o bloquea peticiones externas a través del proxy.");
        console.error("Error Xtream API:", error);
    }
}

function crearElementoEspera() {
    const divCont = document.createElement('div');
    divCont.className = "status-container";
    divCont.innerHTML = `<div class="spinner" id="loading-spinner" style="display:block; margin: 0 auto 10px auto;"></div>
                         <div id="status-text">Conectando con el servidor IPTV de VICRO SYSTEM...</div>`;
    return divCont;
}

function mostrarError(mensaje) {
    playlistUI.innerHTML = `
        <div class="status-container" style="text-align: center; padding: 20px;">
            <div style="color: #ff4d6d; font-size: 24px; margin-bottom: 10px;">⚠️</div>
            <div style="color: #ff4d6d; font-size: 14px; font-weight: 500; line-height: 1.4;">${mensaje}</div>
        </div>`;
}

function renderizarLista(lista) {
    playlistUI.innerHTML = "";
    
    if (lista.length === 0) {
        playlistUI.innerHTML = '<div class="status-container">No se encontraron canales en la grilla actual.</div>';
        return;
    }

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

function reproducirCanal(url) {
    if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            video.play().catch(e => console.log("Interacción requerida"));
        });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url;
        video.addEventListener('loadedmetadata', () => video.play());
    } else {
        video.src = url;
        video.play().catch(e => alert("Tu navegador no soporta el formato de video directo .ts o .m3u8 de este stream."));
    }
}

searchInput.addEventListener('input', (e) => {
    const busqueda = e.target.value.toLowerCase();
    const filtrados = canales.filter(c => c.nombre.toLowerCase().includes(busqueda));
    renderizarLista(filtrados);
});
