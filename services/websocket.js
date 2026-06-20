const WebSocket = require('ws');
const gameStore = require('./gameStore');

let wss = null;


// Lista de conexões ativas
const clients = new Set();


// ======================================================
// INIT
// ======================================================

function initialize(server) {

    wss = new WebSocket.Server({ server });

    wss.on('connection', (ws) => {

        clients.add(ws);

        // envia estado inicial ao conectar
        ws.send(JSON.stringify({
            type: 'GAME_STATE',
            payload: gameStore.getState()
        }));

        ws.on('close', () => {
            clients.delete(ws);
        });

        ws.on('error', () => {
            clients.delete(ws);

            ws.onopen = () => setWSStatus('connected');

            ws.onclose = () => {
                setWSStatus('disconnected');
                setTimeout(connectWS, 1000);
            };

            ws.onerror = () => setWSStatus('disconnected');

        });
    });
}


// ======================================================
// BROADCAST
// ======================================================

function broadcastGameState() {

    const message = JSON.stringify({
        type: 'GAME_STATE',
        payload: gameStore.getState()
    });

    for (const client of clients) {

        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    }
}


// ======================================================
// EXPORTS
// ======================================================

module.exports = {
    initialize,
    broadcastGameState
};