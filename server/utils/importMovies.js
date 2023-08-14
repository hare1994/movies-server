const fs = require('fs');
const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017'; // Change this URI if your MongoDB server is running elsewhere
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

const dbName = 'movies_database';
const collectionName = 'movies';
const filePath = '../data/movies.json'; // Path to your JSON file

async function importMovies() {
    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db(dbName);
        const collection = db.collection(collectionName);

        const fileData = fs.readFileSync(filePath);
        const movies = JSON.parse(fileData);

        const formattedMovies = movies.map(movie => ({
            ...movie,
            genres: movie.genres.join(', ') // Convert genres array to a comma-separated string
        }));

        const insertResult = await collection.insertMany(formattedMovies);
        console.log(`${insertResult.insertedCount} movies inserted`);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        client.close();
        console.log('Disconnected from MongoDB');
    }
}

importMovies();





