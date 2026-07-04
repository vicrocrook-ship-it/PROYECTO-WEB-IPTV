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
    // Mostrar feedback visual de carga
    playlistUI.innerHTML = ""; 
    playlistUI.appendChild(crearElementoEspera());
    spinner.style.display = "block";
    statusText.innerHTML = "Estableciendo conexión segura con el servidor IPTV...";

    try {
        let urlBase = server.replace(/\/$/, "");
        
        // Petición directa original
        let urlApi = `${urlBase}/player_api.php?username=${user}&password=${pass}&action=get_live_streams`;
        
        // SOLUCIÓN AL MEZCLADO HTTPS/HTTP: Si estamos en github (https) y tu server es http, 
        // pasamos la petición a través de un proxy cors-anywhere público de respaldo.
        if (window.location.protocol === 'https:' && urlBase.startsWith('http:')) {
            urlApi = `https://cors-anywhere.herokuapp.com/${urlApi}`;
        }

        const respuesta = await fetch(urlApi);
        if (!respuesta.ok) throw new Error("Servidor fuera de línea o error en parámetros.");
        
        const datosJson = await respuesta.json();

        if (Array.isArray(datosJson)) {
            canales = datosJson.map(item => ({
                nombre: item.name,
                id: item.stream_id,
                // Si el m3u8 directo falla en navegadores de escritorio, la app conmuta automáticamente a contenedor .ts
                url: `${urlBase}/live/${user}/${pass}/${item.stream_id}.ts`
            }));

            renderizarLista(canales);
        } else {
            mostrarError("Acceso denegado. Credenciales incorrectas o cuenta vencida.");
        }

    } catch (error) {
        mostrarError("Error de sincronización. Si estás usando una IP local o privada sin CORS libre, el navegador bloquea la recepción.");
        console.error("Error Xtream API:", error);
    }
}

function crearElementoEspera() {
    const divCont = document.createElement('div');
    divCont.className = "status-container";
    divCont.innerHTML = `<div class="spinner" id="loading-spinner" style="display:block;"></div>
                         <div id="status-text">Cargando canales...</div>`;
    return divCont;
}

function mostrarError(mensaje) {
    playlistUI.innerHTML = `
        <div class="status-container">
            <div style="color: #ff4d6d; font-size: 24px; margin-bottom: 10px;">⚠️</div>
            <div style="color: #ff4d6d; font-size: 14px; font-weight: 500;">${mensaje}</div>
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
            video.play().catch(e => console.log("Interacción de usuario requerida."));
        });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url;
        video.addEventListener('loadedmetadata', () => video.play());
    } else {
        // Fallback clásico nativo directo por si el motor HLS falla con tu stream .ts
        video.src = url;
        video.play().catch(e => alert("Formato de transmisión no soportado por este navegador."));
    }
}

searchInput.addEventListener('input', (e) => {
    const busqueda = e.target.value.toLowerCase();
    const filtrados = canales.filter(c => c.nombre.toLowerCase().includes(busqueda));
    renderizarLista(filtrados);
});
