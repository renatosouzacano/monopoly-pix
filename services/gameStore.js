const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const SAVE_FILE = path.join(DATA_DIR, 'game-state.json');

let state = {
    players: [],
    transactions: []
};


// ======================================================
// HELPERS
// ======================================================

function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

function findPlayer(name) {
    return state.players.find(p => p.name === name);
}

function validatePlayerName(name) {

    if (!name || typeof name !== 'string') {
        throw new Error('Nome de jogador inválido');
    }

    if (!/^[a-z]+$/.test(name)) {
        throw new Error('O nome do jogador deve conter apenas letras minúsculas [a-z]');
    }
}

function saveGame() {

    ensureDataDir();

    fs.writeFileSync(
        SAVE_FILE,
        JSON.stringify(state, null, 2),
        'utf8'
    );
}

function createTransaction(from, to, amount) {

    return {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        from,
        to,
        amount
    };
}

function updateLastTransaction(playerName, transaction) {

    const player = findPlayer(playerName);

    if (!player) {
        return;
    }

    if (transaction.to === playerName) {

        player.lastTransaction = {
            type: 'IN',
            amount: transaction.amount,
            otherParty: transaction.from,
            timestamp: transaction.timestamp
        };

    } else {

        player.lastTransaction = {
            type: 'OUT',
            amount: transaction.amount,
            otherParty: transaction.to,
            timestamp: transaction.timestamp
        };
    }
}


// ======================================================
// CONSULTAS
// ======================================================

function getState() {
    return state;
}

function getPlayers() {
    return state.players;
}

function getPlayer(name) {
    return findPlayer(name);
}


// ======================================================
// JOGADORES
// ======================================================

function createPlayer(name, initialBalance) {

    validatePlayerName(name);

    if (findPlayer(name)) {
        throw new Error('Jogador já existe');
    }

    if (!Number.isInteger(initialBalance)) {
        throw new Error('Saldo inicial deve ser inteiro');
    }

    if (initialBalance < 0) {
        throw new Error('Saldo inicial deve ser positivo');
    }

    const player = {
        name,
        balance: initialBalance,
        deviceToken: null,
        lastTransaction: null
    };

    state.players.push(player);

    saveGame();

    return player;
}


// ======================================================
// DEVICE LOCK
// ======================================================

function claimPlayerDevice(name, deviceToken) {

    const player = findPlayer(name);

    if (!player) {
        throw new Error('Jogador não encontrado');
    }

    if (!deviceToken) {
        throw new Error('Um token é necessário, tente reconectar');
    }

    if (
        player.deviceToken &&
        player.deviceToken !== deviceToken
    ) {
        throw new Error('Já conectado em outro dispositivo.');
    }

    player.deviceToken = deviceToken;

    saveGame();

    return {
        success: true
    };
}

function releasePlayerDevice(name) {

    const player = findPlayer(name);

    if (!player) {
        throw new Error('Jogador não encontrado');
    }

    player.deviceToken = null;

    saveGame();

    return {
        success: true
    };
}


// ======================================================
// TRANSFERÊNCIAS
// ======================================================

function transfer(from, to, amount) {

    if (!Number.isInteger(amount)) {
        throw new Error('Valor deve ser inteiro');
    }

    if (amount <= 0) {
        throw new Error('Valor deve ser maior que zero');
    }

    if (from === to) {
        throw new Error('Origem e destino não podem ser o mesmo');
    }

    const fromIsBank = from === 'bank';
    const toIsBank = to === 'bank';

    if (!fromIsBank && !findPlayer(from)) {
        throw new Error('Jogador de origem não encontrado');
    }

    if (!toIsBank && !findPlayer(to)) {
        throw new Error('Jogador de destino não encontrado');
    }

    // validate balance

    if (!fromIsBank) {

        const sender = findPlayer(from);

        if (sender.balance < amount) {
            throw new Error('Saldo insuficiente');
        }

        sender.balance -= amount;
    }

    if (!toIsBank) {

        const receiver = findPlayer(to);

        receiver.balance += amount;
    }

    const transaction = createTransaction(
        from,
        to,
        amount
    );

    state.transactions.push(transaction);

    if (!fromIsBank) {
        updateLastTransaction(from, transaction);
    }

    if (!toIsBank) {
        updateLastTransaction(to, transaction);
    }

    saveGame();

    return transaction;
}


// ======================================================
// PARTIDA
// ======================================================

function newGame() {

    state = {
        players: [],
        transactions: []
    };

    saveGame();
}

function loadGame() {

    ensureDataDir();

    if (!fs.existsSync(SAVE_FILE)) {

        state = {
            players: [],
            transactions: []
        };

        return;
    }

    const raw = fs.readFileSync(
        SAVE_FILE,
        'utf8'
    );

    state = JSON.parse(raw);

    if (!state.players) {
        state.players = [];
    }

    if (!state.transactions) {
        state.transactions = [];
    }
}


// ======================================================
// EXPORTS
// ======================================================

module.exports = {
    getState,
    getPlayers,
    getPlayer,

    createPlayer,

    claimPlayerDevice,
    releasePlayerDevice,

    transfer,

    saveGame,
    loadGame,
    newGame
};