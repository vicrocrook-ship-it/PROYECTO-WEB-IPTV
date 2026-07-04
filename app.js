const video = document.getElementById('video');
const playlistUI = document.getElementById('playlist');
const searchInput = document.getElementById('search');

// Elementos del formulario Xtream Codes
const serverInput = document.getElementById('xc-server');
const userInput = document.getElementById('xc-user');
const passInput = document.getElementById('xc-pass');
const btnConectar = document.getElementById('btn-conectar');

let canales = []; // Canales en vivo obtenidos de la API

// 1. Intentar Auto-Login si ya existen credenciales guardadas
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

// 2. Escuchar el evento del botón Conectar
btnConectar.addEventListener('click', () => {
    const server = serverInput.value.trim();
    const user = userInput.value.trim();
    const pass = passInput.value.trim();

    if (server && user && pass) {
        const infoLogin = { server, user, pass };
        localStorage.setItem('xc_login_data', JSON.stringify(infoLogin));
        conectarXtream(server, user, pass);
    } else {
        alert("Por favor, rellena todos los campos.");
    }
});

// 3. Conexión principal con la API de Xtream Codes
async function conectarXtream(server, user, pass) {
    try {
        playlistUI.innerHTML = '<div class="status-msg">Validando cuenta y cargando canales...</div>';
        
        // Limpiamos la URL quitando barras diagonales al final si las hay
        const urlBase = server.replace(/\/$/, "");
        
        // Endpoint estándar de la API de Xtream Codes para obtener canales en vivo
        const urlApi = `${urlBase}/player_api.php?username=${user}&password=${pass}&action=get_live_streams`;

        const respuesta = await fetch(urlApi);
        if (!respuesta.ok) throw new Error("Error en la respuesta del servidor.");
        
        const datosJson = await respuesta.json();

        // Xtream Codes devuelve un array con los canales si las credenciales son correctas
        if (Array.isArray(datosJson)) {
            // Guardamos y formateamos la lista para nuestro reproductor
            canales = datosJson.map(item => ({
                nombre: item.name,
                id: item.stream_id,
                // Construimos la URL del streaming directo según el estándar Xtream Codes
                url: `${urlBase}/live/${user}/${pass}/${item.stream_id}.m3u8` 
            }));

            renderizarLista(canales);
        } else {
            playlistUI.innerHTML = '<div class="status-msg" style="color: red;">Datos incorrectos o cuenta expirada.</div>';
        }

    } catch (error) {
        playlistUI.innerHTML = `
            <div class="status-msg" style="color: red;">
                <strong>Error de Conexión.</strong><br>
                Revisa que el dominio sea correcto o verifica problemas de CORS en tu servidor.
            </div>`;
        console.error("Error Xtream Codes API:", error);
    }
}

// 4. Mostrar canales en pantalla
function renderizarLista(lista) {
    playlistUI.innerHTML = "";
    
    if (lista.length === 0) {
        playlistUI.innerHTML = '<div class="status-msg">No se encontraron canales.</div>';
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

// 5. Motor del reproductor de video (HLS)
function reproducirCanal(url) {
    if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            video.play().catch(err => console.log("Auto-play requiere interacción"));
        });
        
        // Manejo de errores de stream caídos
        hls.on(Hls.Events.ERROR, function (event, data) {
            if (data.fatal) {
                console.log("Error fatal en streaming, intentando formato alternativo (.ts)...");
                // Si el .m3u8 falla, intentamos reproducir el contenedor de transporte clásico (.ts)
                const urlTS = url.replace('.m3u8', '.ts');
                video.src = urlTS;
                video.play().catch(e => {});
            }
        });

    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url;
        video.addEventListener('loadedmetadata', () => video.play());
    } else {
        alert("Navegador no compatible con reproducción de video en vivo.");
    }
}

// 6. Buscador inteligente
searchInput.addEventListener('input', (e) => {
    const busqueda = e.target.value.toLowerCase();
    const filtrados = canales.filter(c => c.nombre.toLowerCase().includes(busqueda));
    renderizarLista(filtrados);
});
