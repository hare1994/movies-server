'use strict';
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const uuid = require('uuid'); // Import the uuid library
const bcrypt = require('bcrypt');

const {getMovies, initializeMovies} = require('./services/moviesService');
const {getUsers, addUser, saveUser} = require("./services/usersService");

let loggedInUserId = null;

const app = express();
app.use(express.static(path.join(__dirname, 'dist')));

// Allow cors
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:4200'); // update to match the domain you will make the request from
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE,PATCH, OPTIONS');
    next();
});

// For post request, encode the body
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

app.post('/checkConnectedUser', async (req, res) => {
    const { storedUserId } = req.body;

    let checkResult = false;
    let user = null;

    if(storedUserId === loggedInUserId) {
        const users = await getUsers();
        user = users.find(user => user.userId === loggedInUserId);
        checkResult = true;
    }

    res.send({isValid: checkResult, user });
});

// Sign Up Route
app.post('/signup', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Check if the user already exists
        const users = await getUsers();
        if (users.length >= 5) {
            return res.status(400).json({ message: 'The system can have maximum of 5 registered users' });
        }

        if (users.some(user => user.username === username)) {
            return res.status(400).json({ message: 'Username already taken' });
        }

        // Generate a random user ID using uuid
        const userId = uuid.v4();

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Add the new user
        await addUser({ userId, username, password: hashedPassword, favoriteMovies: [] });
        const newUser = {username, userId, favoriteMovies: []};
        loggedInUserId = userId;
        return res.send(newUser);
    } catch (error) {
        return res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Login Route
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Find the user by username
        const users = await getUsers();
        const user = users.find(user => user.username === username);

        // Check if user exists and verify password
        if (!user) {
            return res.status(400).json({ message: 'Invalid username or password' });
        }

        // Compare hashed password
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Invalid username or password' });
        }

        loggedInUserId = user.userId;

        return res.send(user);
    } catch (error) {
        return res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Logout Route
app.post('/logout', (req, res) => {
    loggedInUserId = null;

    return res.status(200).json({ message: 'Logout successful' });
});

app.get('/movies', async (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');

    const movies = await getMovies();
    let {page, pageSize, search, genres } = req.query;

    // Convert page and pageSize to numbers
    page = parseInt(page);
    pageSize = parseInt(pageSize);

    // Check if page and pageSize are valid numbers
    if (isNaN(page) || isNaN(pageSize) || page < 1 || pageSize < 1) {
        return res.status(400).json({error: 'Invalid page or pageSize'});
    }

    let filteredMovies = movies;

    // Apply search filter if search query parameter is provided
    if (search) {
        const searchQuery = search.toLowerCase();
        filteredMovies = movies.filter(movie => movie.title.toLowerCase().includes(searchQuery));
    }

    // Apply genre filter if genres query parameter is provided
    if (genres) {
        const selectedGenres = genres.split(','); // Split genres into an array
        filteredMovies = filteredMovies.filter(movie => selectedGenres.some(genre => movie.genres.includes(genre)));
    }

    if (loggedInUserId) { // if a user is logged in, update for each movie his "isFavorite" property
        const users = await getUsers();
        const user = users.find(user => user.userId === loggedInUserId);

        user.favoriteMovies.forEach(movieId => {
            const favoriteMovieIndexInPaginatedPage = filteredMovies.findIndex(movie => movie.id === movieId);

            if (favoriteMovieIndexInPaginatedPage !== -1) {
                filteredMovies[favoriteMovieIndexInPaginatedPage].isFavorite = true;
            }
        })
    }

    // Calculate the starting and ending indexes based on the requested page and page size
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedMovies = filteredMovies.slice(startIndex, endIndex);

    res.json({
        paginatedMovies,
        total: filteredMovies.length,
    });
});

app.get('/movies/:id', async (req, res) => {
    // not in use

    res.header('Access-Control-Allow-Origin', '*');
    const movies = await getMovies();
    res.send(movies.filter(movie => movie.id === req.params.id));
});

app.get('/favorites', async (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');

    if (loggedInUserId) { // if a user is logged in,
        const movies = await getMovies();

        const users = await getUsers();
        const user = users.find(user => user.userId === loggedInUserId);

        const favorites = movies
            .filter(movie => user.favoriteMovies.includes(movie.id))
            .map(movie => ({ ...movie, isFavorite: true }));
        res.send(favorites);
    } else {
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

app.post('/favoriteMovie', async (req, res) => {
    try {
        const { userId, movieId } = req.body;

        // Find the user by their user ID
        // Find the user by username
        const users = await getUsers();
        const user = users.find(user => user.userId === userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Add the movie ID to the user's favoriteMovies array
        if (!user.favoriteMovies.includes(movieId)) {
            user.favoriteMovies.push(movieId);
            await saveUser(user);
        }

        await initializeMovies(); // the cache isn't valid anymore because we changed a property value in DB
        res.json({ message: 'Movie added to favorites', movieId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

app.post('/unfavoriteMovie', async (req, res) => {
    try {
        const { userId, movieId } = req.body;

        const users = await getUsers();
        const user = users.find(user => user.userId === userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Remove the movie ID to the user's favoriteMovies array
        if (user.favoriteMovies.includes(movieId)) {
            const indexOfValueToRemove = user.favoriteMovies.findIndex((movie => movie === movieId));
            user.favoriteMovies.splice(indexOfValueToRemove, 1);
            await saveUser(user);
        }
        await initializeMovies(); // the cache isn't valid anymore because we changed a property value in DB
        res.json({ message: 'Movie removed from favorites', movieId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

app.listen(3000, function () {
    console.log(`app listening on port ${3000}!`);
});

module.exports = app;
