const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017'; // Change this URI if your MongoDB server is running elsewhere
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

const dbName = 'movies_database';
const collectionName = 'users';

let cachedUsers = null;

async function initializeUsers() {
    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db(dbName);
        const collection = db.collection(collectionName);

        cachedUsers = await collection.find({}).toArray();
        console.log('Users initialized');
    } catch (error) {
        console.error('Error initializing users:', error);
        cachedUsers = [];
    }
}

async function getUsers() {
    if (cachedUsers === null) {
        await initializeUsers();
    }
    return cachedUsers;
}

async function addUser(user) {
    try {
        const db = client.db(dbName);
        const collection = db.collection(collectionName);

        await collection.insertOne(user);

        // because the cahce is not up to date now
        await initializeUsers();
        console.log('User added:', user);
    } catch (error) {
        console.error('Error adding user:', error);
    }
}

async function saveUser(user) {
    try {
        const db = client.db(dbName);
        const collection = db.collection(collectionName);

        // Replace the existing user with the updated user data
        await collection.updateOne({ userId: user.userId }, { $set: user });
        console.log('User saved:', user);
    } catch (error) {
        console.error('Error saving user:', error);
    }
}

module.exports = { getUsers, addUser, saveUser };
