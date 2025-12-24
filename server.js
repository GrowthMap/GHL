const express = require('express');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Data storage file
const DATA_FILE = path.join(__dirname, 'data', 'locations.json');

// Ensure data directory exists
async function ensureDataDir() {
    const dataDir = path.join(__dirname, 'data');
    try {
        await fs.access(dataDir);
    } catch {
        await fs.mkdir(dataDir, { recursive: true });
    }
}

// Initialize data file if it doesn't exist
async function initDataFile() {
    await ensureDataDir();
    try {
        await fs.access(DATA_FILE);
    } catch {
        await fs.writeFile(DATA_FILE, JSON.stringify([]), 'utf8');
    }
}

// Read all locations
async function readLocations() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading locations:', error);
        return [];
    }
}

// Write all locations
async function writeLocations(locations) {
    await ensureDataDir();
    await fs.writeFile(DATA_FILE, JSON.stringify(locations, null, 2), 'utf8');
}

// API Routes

// Get all locations
app.get('/api/locations', async (req, res) => {
    try {
        const locations = await readLocations();
        res.json(locations);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load locations' });
    }
});

// Get a specific location by ID
app.get('/api/config/:locationId', async (req, res) => {
    try {
        const { locationId } = req.params;
        const locations = await readLocations();
        const location = locations.find(l => l.id === locationId);
        
        if (!location) {
            return res.status(404).json({ error: 'Location not found' });
        }
        
        res.json(location);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load location' });
    }
});

// Save all locations
app.post('/api/locations', async (req, res) => {
    try {
        const locations = req.body;
        await writeLocations(locations);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save locations' });
    }
});

// Save/update a specific location
app.put('/api/locations/:locationId', async (req, res) => {
    try {
        const { locationId } = req.params;
        const location = req.body;
        
        if (location.id !== locationId) {
            return res.status(400).json({ error: 'Location ID mismatch' });
        }
        
        const locations = await readLocations();
        const index = locations.findIndex(l => l.id === locationId);
        
        if (index === -1) {
            locations.push(location);
        } else {
            locations[index] = location;
        }
        
        await writeLocations(locations);
        res.json({ success: true, location });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save location' });
    }
});

// Delete a location
app.delete('/api/locations/:locationId', async (req, res) => {
    try {
        const { locationId } = req.params;
        const locations = await readLocations();
        const filtered = locations.filter(l => l.id !== locationId);
        await writeLocations(filtered);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete location' });
    }
});

// Handle all routes by serving index.html (for SPA-like behavior)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Initialize and start server
initDataFile().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on port ${PORT}`);
    });
});

