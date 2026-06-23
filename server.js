const express = require('express');
const http = require('http');
const path = require('path');

const gameStore = require('./services/gameStore');
const websocket = require('./services/websocket');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use('/static', express.static(path.join(__dirname, 'public')));

websocket.initialize(server);

app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
});

// ======================================================
// PÁGINAS
// ======================================================

app.get('/monopoly/bank', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'bank.html'));
});

app.get('/monopoly/player/:player', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'player.html'));
});


// ======================================================
// CONSULTAS
// ======================================================

app.get('/api/state', (req, res) => {
    res.json(gameStore.getState());
});

app.get('/api/players', (req, res) => {
    res.json(gameStore.getPlayers());
});

app.get('/api/player/:name', (req, res) => {

    const player = gameStore.getPlayer(req.params.name);

    if (!player) {
        return res.status(404).json({
            error: 'Jogador não encontrado'
        });
    }

    res.json(player);
});


// ======================================================
// JOGADORES
// ======================================================

app.post('/api/player', (req, res) => {

    try {

        const { name, initialBalance } = req.body;

        const player = gameStore.createPlayer(
            name,
            Number(initialBalance)
        );

        websocket.broadcastGameState();

        res.status(201).json(player);

    } catch (err) {

        res.status(400).json({
            error: err.message
        });

    }

});


// ======================================================
// DEVICE LOCK
// ======================================================

app.post('/api/player/:name/claim-device', (req, res) => {

    try {

        const { deviceToken } = req.body;

        const result = gameStore.claimPlayerDevice(
            req.params.name,
            deviceToken
        );

        res.json(result);

    } catch (err) {

        res.status(400).json({
            error: err.message
        });

    }

});

app.post('/api/player/:name/release-device', (req, res) => {

    try {

        gameStore.releasePlayerDevice(req.params.name);

        websocket.broadcastGameState();

        res.json({
            success: true
        });

    } catch (err) {

        res.status(400).json({
            error: err.message
        });

    }

});


// ======================================================
// TRANSFERÊNCIAS
// ======================================================

app.post('/api/transfer', (req, res) => {

    try {

        const {
            from,
            to,
            amount
        } = req.body;

        const transaction = gameStore.transfer(
            from,
            to,
            Number(amount)
        );

        websocket.broadcastGameState();

        res.json(transaction);

    } catch (err) {

        res.status(400).json({
            error: err.message
        });

    }

});


// ======================================================
// PARTIDA
// ======================================================

app.post('/api/game/save', (req, res) => {

    try {

        gameStore.saveGame();

        res.json({
            success: true
        });

    } catch (err) {

        res.status(500).json({
            error: err.message
        });

    }

});

app.post('/api/game/load', (req, res) => {

    try {

        gameStore.loadGame();

        websocket.broadcastGameState();

        res.json({
            success: true
        });

    } catch (err) {

        res.status(500).json({
            error: err.message
        });

    }

});

app.post('/api/game/new', (req, res) => {

    try {

        gameStore.newGame();

        websocket.broadcastGameState();

        res.json({
            success: true
        });

    } catch (err) {

        res.status(500).json({
            error: err.message
        });

    }

});


// ======================================================
// HEALTHCHECK
// ======================================================

app.get('/health', (req, res) => {

    res.json({
        status: 'ok',
        timestamp: new Date().toISOString()
    });

});


// ======================================================
// STARTUP
// ======================================================

try {

    gameStore.loadGame();

} catch (err) {

    console.log('Nenhum jogo salvo encontrado.');
}

server.listen(PORT, () => {

    console.log('');
    console.log('================================');
    console.log(' Monopoly PIX - Pix do Banco Imobiliário');
    console.log('================================');
    console.log(`Porta: ${PORT}`);
    console.log(`Banco: http://localhost:${PORT}/monopoly/bank`);
    console.log(`Jogador: http://localhost:${PORT}/monopoly/player/[nome]`);
    console.log('================================');
    console.log('');

});