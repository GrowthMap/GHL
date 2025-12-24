const express = require('express');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3000;

// Database setup - use PostgreSQL if available, otherwise use file storage
let db = null;
let useDatabase = false;

// Try to initialize PostgreSQL database
async function initDatabase() {
    // Check if DATABASE_URL is available (Railway provides this)
    if (process.env.DATABASE_URL) {
        try {
            const { Pool } = require('pg');
            const pool = new Pool({
                connectionString: process.env.DATABASE_URL,
                ssl: process.env.DATABASE_URL.includes('sslmode=require') ? { rejectUnauthorized: false } : false
            });
            
            // Test connection
            await pool.query('SELECT NOW()');
            
            // Create table if it doesn't exist
            await pool.query(`
                CREATE TABLE IF NOT EXISTS locations (
                    id VARCHAR(255) PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    data JSONB NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            // Verify table was created
            const tableCheck = await pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'locations'
                )
            `);
            
            db = pool;
            useDatabase = true;
            console.log('✅ Using PostgreSQL database for storage');
            console.log('✅ Table "locations" exists:', tableCheck.rows[0].exists);
            return true;
        } catch (error) {
            console.error('⚠️  Failed to connect to PostgreSQL, falling back to file storage:', error.message);
            useDatabase = false;
        }
    }
    
    // Fallback to file storage
    console.log('📁 Using file storage (data/locations.json)');
    await initDataFile();
    return false;
}

// File storage functions (fallback)
const DATA_FILE = path.join(__dirname, 'data', 'locations.json');

async function ensureDataDir() {
    const dataDir = path.join(__dirname, 'data');
    try {
        await fs.access(dataDir);
    } catch {
        await fs.mkdir(dataDir, { recursive: true });
    }
}

async function initDataFile() {
    await ensureDataDir();
    try {
        await fs.access(DATA_FILE);
    } catch {
        await fs.writeFile(DATA_FILE, JSON.stringify([]), 'utf8');
    }
}

// Database storage functions
async function readLocations() {
    if (useDatabase && db) {
        try {
            const result = await db.query('SELECT id, name, data FROM locations ORDER BY updated_at DESC');
            return result.rows.map(row => ({
                id: row.id,
                name: row.name,
                ...row.data
            }));
        } catch (error) {
            console.error('Error reading from database:', error);
            return [];
        }
    } else {
        // File storage fallback
        try {
            const data = await fs.readFile(DATA_FILE, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error reading locations:', error);
            return [];
        }
    }
}

async function writeLocations(locations) {
    if (useDatabase && db) {
        try {
            // Use transaction to ensure all locations are saved
            await db.query('BEGIN');
            
            for (const location of locations) {
                const { id, name, ...data } = location;
                await db.query(
                    `INSERT INTO locations (id, name, data, updated_at)
                     VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
                     ON CONFLICT (id) 
                     DO UPDATE SET name = $2, data = $3, updated_at = CURRENT_TIMESTAMP`,
                    [id, name, JSON.stringify(data)]
                );
            }
            
            // Delete locations that are not in the new list
            const ids = locations.map(l => l.id);
            await db.query('DELETE FROM locations WHERE id != ALL($1::text[])', [ids]);
            
            await db.query('COMMIT');
        } catch (error) {
            await db.query('ROLLBACK');
            console.error('Error writing to database:', error);
            throw error;
        }
    } else {
        // File storage fallback
        await ensureDataDir();
        await fs.writeFile(DATA_FILE, JSON.stringify(locations, null, 2), 'utf8');
    }
}

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

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
initDatabase().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on port ${PORT}`);
    });
});
