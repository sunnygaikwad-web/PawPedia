const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
// Serve static frontend files
app.use(express.static(path.join(__dirname, '')));

// Database setup
const db = new sqlite3.Database('./pawpedia.sqlite', (err) => {
    if (err) console.error('Database opening error: ', err);
});

db.serialize(() => {
    // Users Table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT UNIQUE,
        password TEXT
    )`);

    // Community Posts Table
    db.run(`CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        avatar TEXT,
        author TEXT,
        location TEXT,
        time TEXT,
        text TEXT,
        tags TEXT,
        likes INTEGER,
        comments INTEGER,
        category TEXT
    )`);

    // Check if posts are empty, if so, insert mock data
    db.get("SELECT COUNT(*) as count FROM posts", (err, row) => {
        if (!err && row.count === 0) {
            const initialPosts = [
                { avatar: '🧑', author: 'Riya S.', location: 'Mumbai', time: '2 min ago', text: 'Just spotted a Painted Stork near our local lake! 😍', tags: '["#BirdWatching", "#Wildlife"]', likes: 24, comments: 8, category: 'photos' },
                { avatar: '👩', author: 'Priya M.', location: 'Pune', time: '15 min ago', text: 'My Golden Retriever has been scratching a lot. Help? 🐕', tags: '["#DogHealth", "#Help"]', likes: 12, comments: 19, category: 'questions' },
                { avatar: '👦', author: 'Arjun K.', location: 'Delhi', time: '1 hr ago', text: 'Found my cat Mochi using PawPedia! Never give up searching ❤️', tags: '["#Cats", "#Adoption"]', likes: 89, comments: 34, category: 'adoption' }
            ];
            const stmt = db.prepare("INSERT INTO posts (avatar, author, location, time, text, tags, likes, comments, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
            initialPosts.forEach(p => stmt.run(p.avatar, p.author, p.location, p.time, p.text, p.tags, p.likes, p.comments, p.category));
            stmt.finalize();
        }
    });

    // Pet Reminders Table
    db.run(`CREATE TABLE IF NOT EXISTS reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pet TEXT,
        text TEXT,
        date TEXT
    )`);

    // Advanced Habits (for Pet Care interactivity)
    db.run(`CREATE TABLE IF NOT EXISTS habits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pet TEXT,
        habit TEXT,
        streak INTEGER,
        last_logged TEXT
    )`);

    // User Progress (Learning Hub)
    db.run(`CREATE TABLE IF NOT EXISTS user_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        topic TEXT,
        score INTEGER,
        completed_at TEXT
    )`);

    // Advanced Pet Health Tracking
    db.run(`CREATE TABLE IF NOT EXISTS pet_health (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        pet_name TEXT,
        pet_type TEXT,
        weight REAL,
        vaccine_name TEXT,
        vaccine_date TEXT,
        notes TEXT
    )`);
});

// ====== API ENDPOINTS ======

// --- Authentication ---
app.post('/api/signup', (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });
    
    db.run("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", [name, email, password], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Email already exists' });
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, user: { id: this.lastID, name, email } });
    });
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
    
    db.get("SELECT id, name, email FROM users WHERE email = ? AND password = ?", [email, password], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(401).json({ error: 'Invalid email or password' });
        res.json({ success: true, user: row });
    });
});

// --- Community Feed ---
app.get('/api/posts', (req, res) => {
    db.all("SELECT * FROM posts ORDER BY id DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        rows.forEach(r => r.tags = JSON.parse(r.tags));
        res.json(rows);
    });
});

app.post('/api/posts', (req, res) => {
    const { avatar, author, location, time, text, tags, likes, comments, category } = req.body;
    db.run(`INSERT INTO posts (avatar, author, location, time, text, tags, likes, comments, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [avatar, author, location, time, text, JSON.stringify(tags), likes, comments, category],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        });
});

app.post('/api/posts/:id/like', (req, res) => {
    const { id } = req.params;
    const { increment } = req.body; // true or false
    db.run(`UPDATE posts SET likes = likes + ? WHERE id = ?`, [increment ? 1 : -1, id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// --- Pet Care Reminders ---
app.get('/api/reminders/:pet', (req, res) => {
    db.all("SELECT * FROM reminders WHERE pet = ?", [req.params.pet], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/reminders', (req, res) => {
    const { pet, text, date } = req.body;
    db.run(`INSERT INTO reminders (pet, text, date) VALUES (?, ?, ?)`, [pet, text, date], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID });
    });
});

app.delete('/api/reminders/:id', (req, res) => {
    db.run("DELETE FROM reminders WHERE id = ?", [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// --- Pet Daily Habits ---
app.get('/api/habits/:pet', (req, res) => {
    db.all("SELECT * FROM habits WHERE pet = ?", [req.params.pet], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/habits', (req, res) => {
    const { pet, habit, streak, last_logged } = req.body;
    db.get("SELECT * FROM habits WHERE pet = ? AND habit = ?", [pet, habit], (err, row) => {
        if (row) {
            db.run("UPDATE habits SET streak = ?, last_logged = ? WHERE id = ?", [streak, last_logged, row.id], function(err) {
                res.json({ success: true, id: row.id, streak });
            });
        } else {
            db.run("INSERT INTO habits (pet, habit, streak, last_logged) VALUES (?, ?, ?, ?)", [pet, habit, streak, last_logged], function(err) {
                res.json({ success: true, id: this.lastID, streak });
            });
        }
    });
});

// --- Learning Hub Facts ---
const allFacts = [
    { emoji: '🦒', title: "Giraffes have 7 neck bones!", body: "Just like humans, they have 7 cervical vertebrae, but each one is elongated." },
    { emoji: '🐘', title: "Elephants can't jump!", body: "Due to their massive weight, elephants are physically incapable of jumping." },
    { emoji: '🦦', title: "Sea otters hold hands!", body: "They hold hands while sleeping to avoid drifting apart in the ocean." },
    { emoji: '🐙', title: "Octopuses have 3 hearts!", body: "Two pump blood to the gills, one to the body. Their blood is blue!" },
    { emoji: '🦅', title: "Eagles have super vision!", body: "They can spot a rabbit from 3 kilometers away." },
    { emoji: '🐋', title: "Blue whales are massive!", body: "Their hearts weigh 180 kg and beat so loud they can be heard 3 km away." },
    { emoji: '🦥', title: "Sloths are incredibly slow!", body: "They move so slowly that algae actually grows on their fur to camouflage them." },
    { emoji: '🐝', title: "Bees can recognize human faces!", body: "Honeybees have been shown to recognize and remember human faces." },
    { emoji: '🐧', title: "Penguins propose with pebbles!", body: "Male Gentoo penguins search for the perfect pebble to give to their mate." },
    { emoji: '🦇', title: "Bats are the only flying mammals!", body: "While flying squirrels glide, bats are the only mammals capable of true flight." },
    { emoji: '🦘', title: "Kangaroos can't walk backwards!", body: "Their muscular tail and leg structure prevent them from moving in reverse." },
    { emoji: '🐊', title: "Crocodiles swallow stones!", body: "They swallow stones to help grind up food in their stomachs and as ballast to dive deep." },
    { emoji: '🐼', title: "Pandas poop up to 40 times a day!", body: "Due to their bamboo-only diet, they consume massive amounts and excrete just as much." },
    { emoji: '🐸', title: "Some frogs freeze in winter!", body: "Wood frogs can freeze solid during winter and thaw out alive in the spring." },
    { emoji: '🐕', title: "Dogs possess a 'sixth sense'!", body: "A dog's sense of smell is 10,000 to 100,000 times more sensitive than ours." },
    { emoji: '🐈', title: "Cats spend 70% of their lives sleeping!", body: "A 9-year-old cat has spent roughly 6 years asleep." },
    { emoji: '🦜', title: "Parrots have names!", body: "Wild parrots give their chicks unique vocal calls that act like names." },
    { emoji: '🦈', title: "Sharks do not have bones!", body: "Their entire skeletal system is made of cartilage, the same tissue in our ears." },
    { emoji: '🦓', title: "Zebra stripes act as bug repellent!", body: "The striped pattern visually confuses biting flies like horseflies." },
    { emoji: '🐖', title: "Pigs are highly intelligent!", body: "They are considered smarter than dogs and even 3-year-old human children." },
    { emoji: '🦩', title: "Flamingos are not naturally pink!", body: "They are born grey. Their diet of brine shrimp and algae turns them pink." },
    { emoji: '🐌', title: "Snails can sleep for 3 years!", body: "If the weather isn't suitable, a snail can hibernate for up to three years." },
    { emoji: '🐢', title: "Turtles breathe through their butts!", body: "Some species, like the Fitzroy River turtle, can absorb oxygen through their cloaca." },
    { emoji: '🐜', title: "Ants don't have lungs!", body: "They breathe through tiny spiracles (holes) located along the sides of their bodies." },
    { emoji: '🦋', title: "Butterflies taste with their feet!", body: "They land on plants and use taste sensors on their feet to find nectar." },
    { emoji: '🐒', title: "Capuchin monkeys use tools!", body: "They use rocks to crack open nuts, a behavior passed down culturally." },
    { emoji: '🦉', title: "Owls can rotate their heads 270 degrees!", body: "Because their eyes are fixed in their sockets, they twist their necks to look around." },
    { emoji: '🐁', title: "Mice can laugh!", body: "When tickled or playing, mice emit ultrasonic 'giggles' that humans can't hear." },
    { emoji: '🐪', title: "Camels have 3 eyelids!", body: "This protects their eyes from blowing sand in the harsh desert environment." },
    { emoji: '🐎', title: "Horses can't throw up!", body: "Their digestive system is a one-way street; vomiting is biologically impossible for them." },
];

app.get('/api/facts', (req, res) => {
    res.json(allFacts);
});

// --- Adoption Email Request (Ethereal) ---
let transporterCache = null;

async function getTransporter() {
    if (transporterCache) return transporterCache;
    // Generate a test account on Ethereal automatically during startup
    let testAccount = await nodemailer.createTestAccount();
    transporterCache = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: testAccount.user, // generated ethereal user
            pass: testAccount.pass, // generated ethereal password
        },
    });
    return transporterCache;
}

app.post('/api/adopt', async (req, res) => {
    const { name, email, petName } = req.body;
    if (!name || !email || !petName) return res.status(400).json({ error: 'Missing fields' });

    try {
        let transporter = await getTransporter();
        
        let info = await transporter.sendMail({
            from: '"PawPedia Shelter Portal 🏠" <shelter@pawpedia.local>',
            to: email,
            subject: `Adoption Request Received for ${petName}!`,
            html: `<h2>Hi ${name},</h2>
                   <p>Thank you for your interest in giving <b>${petName}</b> a loving forever home!</p>
                   <p>Our shelter team will review your application and try to get back to you within 48 hours for a potential meet & greet.</p>
                   <p><b>Note:</b> Make sure to prepare your home before the visit! Checkout our Pet Care section for a complete guide.</p>
                   <br><p>Best,</p><p>The PawPedia Team 🐾</p>`
        });

        const previewURL = nodemailer.getTestMessageUrl(info);
        console.log("Fake Email delivered! View it here: ", previewURL);
        
        res.json({ success: true, previewURL });
    } catch (err) {
        console.error("Email Error:", err);
        res.status(500).json({ error: 'Failed to send email' });
    }
});

// --- SIMULATED AI ENDPOINTS ---

app.post('/api/chat', (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });

    // A very simple simulated intelligent response based on keywords
    const lowerMsg = message.toLowerCase();
    let reply = "I'm a simulated AI assistant powered by PawPedia. Could you rephrase your question about animals or pet care?";
    
    if (lowerMsg.includes('lion') || lowerMsg.includes('lions')) {
        reply = "Lions are large cats native to Africa and India. They are the only cats that live in groups, called prides. **Key Fact:** A lion's roar can be heard from 5 miles away!\n\n**Fun Fact:** Female lions do 85-90% of the hunting.";
    } else if (lowerMsg.includes('dog') && lowerMsg.includes('care')) {
        reply = "**Dog Care Tips:**\n1. Feed a balanced diet appropriate for their age and size.\n2. Ensure they get daily exercise.\n3. Keep up with vaccinations and tick/flea prevention.\n4. Provide plenty of mental stimulation and affection.\n\nWant specific tips on a certain breed?";
    } else if (lowerMsg.includes('panda') || (lowerMsg.includes('what') && lowerMsg.includes('eat') && lowerMsg.includes('panda'))) {
        reply = "Pandas almost exclusively eat bamboo! In fact, their diet is 99% bamboo. They eat up to 40 pounds of it every single day because bamboo is very low in nutrients.";
    } else if (lowerMsg.includes('food chain')) {
        reply = "A food chain shows how energy is transferred from one living organism to another. \n- **Producers** (plants) make energy from the sun.\n- **Primary Consumers** (herbivores) eat plants.\n- **Secondary Consumers** (carnivores) eat herbivores.\n- **Apex Predators** are at the very top of the chain!";
    }

    // Simulate AI processing delay
    setTimeout(() => {
        res.json({ reply });
    }, 1500);
});

app.post('/api/generate-quiz', (req, res) => {
    const { topic, difficulty } = req.body;
    
    // Simulate dynamically generated questions
    let questions = [];

    if (topic === 'Mammals') {
        questions = [
            { q: "Which mammal is known for carrying its baby in a pouch?", options: ["Bear", "Kangaroo", "Elephant", "Tiger"], answer: "Kangaroo" },
            { q: "What is the only mammal capable of true sustained flight?", options: ["Flying Squirrel", "Bat", "Lemur", "Sugar Glider"], answer: "Bat" },
            { q: "Which of these is a marine mammal?", options: ["Shark", "Penguin", "Dolphin", "Sea Turtle"], answer: "Dolphin" }
        ];
    } else if (topic === 'Adaptive Traits' || topic === 'Adaptations') {
        questions = [
            { q: "What is the purpose of a camel's hump?", options: ["Storing water", "Storing fat", "Cooling the body", "Attracting mates"], answer: "Storing fat" },
            { q: "Which animal uses echolocation to navigate in the dark?", options: ["Owl", "Bat", "Cat", "Wolf"], answer: "Bat" }
        ];
    } else {
        // Generic fallback topics
        questions = [
            { q: `What is a common characteristic of ${topic}?`, options: ["Gills", "Fur/Hair", "Feathers", "Scales"], answer: "Fur/Hair" },
            { q: `Where do you typically find ${topic}?`, options: ["Tundra", "Rainforest", "Ocean", "Various habitats"], answer: "Various habitats" }
        ];
    }

    setTimeout(() => {
        res.json({ topic, questions });
    }, 1000);
});

// --- User Progress & Tracking ---
app.post('/api/progress', (req, res) => {
    const { user_id, topic, score } = req.body;
    const completed_at = new Date().toISOString();
    db.run("INSERT INTO user_progress (user_id, topic, score, completed_at) VALUES (?, ?, ?, ?)", [user_id, topic, score, completed_at], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id: this.lastID });
    });
});

app.get('/api/progress/:user_id', (req, res) => {
    db.all("SELECT * FROM user_progress WHERE user_id = ?", [req.params.user_id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// --- Advanced Pet Health ---
app.post('/api/health-logs', (req, res) => {
    const { user_id, pet_name, pet_type, weight, vaccine_name, vaccine_date, notes } = req.body;
    db.run(
        "INSERT INTO pet_health (user_id, pet_name, pet_type, weight, vaccine_name, vaccine_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [user_id, pet_name, pet_type, weight, vaccine_name, vaccine_date, notes],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID });
        }
    );
});

app.get('/api/health-logs/:user_id', (req, res) => {
    db.all("SELECT * FROM pet_health WHERE user_id = ? ORDER BY id DESC", [req.params.user_id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.delete('/api/health-logs/:id', (req, res) => {
    db.run("DELETE FROM pet_health WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// --- Start Server ---
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🚀 PawPedia Backend running at http://localhost:${PORT}`);
        console.log(`Database (SQLite) connected successfully.`);
    });
}

// Export for Vercel serverless deployment
module.exports = app;
