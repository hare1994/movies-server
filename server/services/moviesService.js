const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017'; // Change this URI if your MongoDB server is running elsewhere
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

const dbName = 'movies_database';
const collectionName = 'movies';

let cachedMovies = null;

async function initializeMovies() {
    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db(dbName);
        const collection = db.collection(collectionName);

        cachedMovies = await collection.find({}).toArray();
        console.log('Movies initialized');
    } catch (error) {
        console.error('Error initializing movies:', error);
        cachedMovies = [];
    }
}

async function getMovies() {
    if (cachedMovies === null) {
        await initializeMovies();
    }
    return cachedMovies;
}

module.exports = { getMovies, initializeMovies };
