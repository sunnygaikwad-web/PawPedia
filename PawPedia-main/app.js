// ===========================
//  PAWPEDIA — app.js
// ===========================

/* ---- HERO SEARCH ---- */
function doSearch() {
    const val = document.getElementById('heroSearch').value.trim();
    if (val) {
        window.location.href = `encyclopedia.html?q=${encodeURIComponent(val)}`;
    } else {
        if (window.showToast) window.showToast('Please enter an animal name to search.', 'warning');
    }
}
document.getElementById('heroSearch')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') doSearch();
});

/* ---- ANIMAL SPOTLIGHT ---- */
const animals = [
    { emoji: '🦁', tag: 'Mammal · Africa', name: 'African Lion', sci: 'Panthera leo', desc: 'The African lion is the second-largest big cat in the world. Known as the "King of the Jungle," lions are actually savannah animals — social, powerful, and surprisingly affectionate within their prides.', facts: ['🏃 80 km/h top speed', '⚖️ Up to 250 kg', '📍 Sub-Saharan Africa', '⚠️ Vulnerable'] },
    { emoji: '🐬', tag: 'Mammal · Ocean', name: 'Bottlenose Dolphin', sci: 'Tursiops truncatus', desc: 'Bottlenose dolphins are among the most intelligent animals on Earth. They communicate with a complex system of clicks and whistles, use tools, and display empathy — even towards other species.', facts: ['🌊 Lives in all oceans', '🧠 IQ comparable to primates', '⚖️ Up to 650 kg', '✅ Least Concern'] },
    { emoji: '🦋', tag: 'Insect · Worldwide', name: 'Monarch Butterfly', sci: 'Danaus plexippus', desc: 'The Monarch butterfly undertakes one of the most extraordinary migrations in the animal kingdom — up to 4,800 km from Canada to Mexico every year, guided only by instinct and the sun.', facts: ['✈️ 4,800 km migration', '🌿 Feeds on milkweed', '⏳ Lives 6–8 months', '⚠️ Endangered'] },
    { emoji: '🐘', tag: 'Mammal · Africa & Asia', name: 'African Elephant', sci: 'Loxodonta africana', desc: 'The largest land animal on Earth, African elephants are highly social creatures with incredible memory, complex emotions, and the ability to mourn their dead. They are essential ecosystem engineers.', facts: ['⚖️ Up to 6,000 kg', '🐘 Largest land animal', '🧠 Exceptional memory', '⚠️ Endangered'] },
    { emoji: '🦜', tag: 'Bird · Tropical', name: 'Scarlet Macaw', sci: 'Ara macao', desc: 'The Scarlet Macaw is one of the most vibrant birds on Earth. These intelligent parrots can mimic human speech, solve puzzles, and form lifelong pair bonds with their mates.', facts: ['🦜 Can mimic speech', '❤️ Mates for life', '📍 Central & South America', '✅ Least Concern'] },
];
let spotlightIdx = 0;

function renderSpotlight() {
    const a = animals[spotlightIdx];
    const card = document.getElementById('spotlightCard');
    card.style.opacity = 0;
    setTimeout(() => {
        card.innerHTML = `
      <div class="spotlight-emoji">${a.emoji}</div>
      <div class="spotlight-info">
        <span class="spotlight-tag">${a.tag}</span>
        <h3 class="spotlight-name">${a.name}</h3>
        <p class="spotlight-sci">${a.sci}</p>
        <p class="spotlight-desc">${a.desc}</p>
        <div class="spotlight-facts">${a.facts.map(f => `<div class="fact-pill">${f}</div>`).join('')}</div>
        <a href="encyclopedia.html" class="btn btn-primary" style="margin-top:1.5rem;display:inline-block;">Read Full Profile →</a>
      </div>`;
        card.style.opacity = 1;
        document.getElementById('spotlightDot').textContent = `${spotlightIdx + 1} / ${animals.length}`;
    }, 200);
}

function changeSpotlight(dir) {
    spotlightIdx = (spotlightIdx + dir + animals.length) % animals.length;
    renderSpotlight();
}

// Auto-rotate spotlight every 5s
setInterval(() => changeSpotlight(1), 5000);

/* ---- QUIZ ---- */
const quizzes = [
    { q: 'Which is the largest land animal on Earth?', opts: ['🦏 White Rhinoceros', '🐘 African Elephant', '🦛 Hippopotamus', '🐪 Dromedary Camel'], ans: 1 },
    { q: 'How long can a Giant Tortoise live?', opts: ['🐢 Up to 50 years', '🐢 Up to 100 years', '🐢 Up to 150 years', '🐢 Up to 200 years'], ans: 3 },
    { q: 'Which bird cannot fly but is the fastest runner?', opts: ['🦚 Peacock', '🐧 Penguin', '🦅 Eagle', '🦤 Ostrich'], ans: 3 },
    { q: 'What do you call a group of lions?', opts: ['🦁 A pack', '🦁 A pride', '🦁 A flock', '🦁 A colony'], ans: 1 },
    { q: 'Which animal has the longest gestation period?', opts: ['🐘 African Elephant', '🦒 Giraffe', '🐋 Blue Whale', '🦏 Rhinoceros'], ans: 0 },
];
let quizIdx = 0;

function renderQuiz() {
    const q = quizzes[quizIdx];
    document.getElementById('quizQ').textContent = q.q;
    document.getElementById('quizResult').textContent = '';
    document.getElementById('quizNext').style.display = 'none';
    const opts = document.getElementById('quizOpts');
    opts.innerHTML = q.opts.map((o, i) =>
        `<button class="quiz-opt" onclick="answerQuiz(this,${i === q.ans})">${o}</button>`
    ).join('');
}

function answerQuiz(btn, correct) {
    const opts = document.querySelectorAll('.quiz-opt');
    opts.forEach(b => { b.disabled = true; });
    btn.classList.add(correct ? 'correct' : 'wrong');
    if (!correct) opts[quizzes[quizIdx].ans].classList.add('correct');
    document.getElementById('quizResult').textContent = correct ? '🎉 Correct! Well done!' : '❌ Not quite — see the correct answer above.';
    document.getElementById('quizNext').style.display = 'block';
}

function nextQuiz() {
    quizIdx = (quizIdx + 1) % quizzes.length;
    renderQuiz();
}

/* ---- PET CARE TABS ---- */
const careData = {
    dog: { icon: '🐕', cards: [{ ico: '🍖', t: 'Feeding', p: 'Adult dogs need 2 meals/day. Puppies 3–4. Always fresh water available.' }, { ico: '🚿', t: 'Grooming', p: 'Brush coat 2–3x weekly. Bathe every 4–6 weeks. Trim nails monthly.' }, { ico: '🏃', t: 'Exercise', p: 'At least 30–60 min of active play or walks per day.' }, { ico: '💉', t: 'Health', p: 'Annual vet checkup. Core vaccines: Rabies, Distemper, Parvo, Hepatitis.' }] },
    cat: { icon: '🐈', cards: [{ ico: '🐟', t: 'Feeding', p: 'Cats need 2 small meals/day. Use wet + dry food mix for hydration.' }, { ico: '🪮', t: 'Grooming', p: 'Brush short-haired cats weekly, long-haired daily. Trim nails every 2 weeks.' }, { ico: '🎾', t: 'Play', p: '15–20 min of interactive play twice a day keeps cats mentally stimulated.' }, { ico: '💉', t: 'Health', p: 'Annual vet visit. Vaccines: Rabies, FVRCP. Spay/neuter recommended.' }] },
    bird: { icon: '🦜', cards: [{ ico: '🌰', t: 'Feeding', p: 'Seeds, pellets, fresh fruits and veggies. Avoid avocado & chocolate.' }, { ico: '🛁', t: 'Bathing', p: 'Provide a shallow water dish for bathing 2–3x per week.' }, { ico: '🧠', t: 'Enrichment', p: 'Birds are intelligent — provide toys, puzzles, and daily interaction.' }, { ico: '🩺', t: 'Health', p: 'Annual avian vet checkup. Watch for feather plucking or lethargy.' }] },
    fish: { icon: '🐠', cards: [{ ico: '🥣', t: 'Feeding', p: 'Feed small amounts 1–2x/day. Uneaten food pollutes water quickly.' }, { ico: '💧', t: 'Water', p: 'Change 25% of water weekly. Test pH, ammonia & nitrites monthly.' }, { ico: '🌡️', t: 'Temperature', p: 'Most tropical fish need 24–28°C. Use a reliable aquarium heater.' }, { ico: '🩺', t: 'Health', p: 'Quarantine new fish for 2 weeks. Watch for white spots (Ich) or fin rot.' }] },
    rabbit: { icon: '🐰', cards: [{ ico: '🥕', t: 'Feeding', p: 'Unlimited hay + leafy greens daily. Pellets in moderation. No sugary treats.' }, { ico: '✂️', t: 'Grooming', p: 'Brush weekly (daily for long-haired). Check nails every 4–6 weeks.' }, { ico: '🏡', t: 'Housing', p: 'Rabbits need at least 4 hrs out of cage daily. Bunny-proof your home.' }, { ico: '💉', t: 'Health', p: 'Vaccinate against RHDV & myxomatosis. Spay/neuter reduces health risks.' }] },
};

function switchTab(el, pet) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    const d = careData[pet];
    document.getElementById('petcareContent').innerHTML = `<div class="care-cards">${d.cards.map(c => `<div class="care-card"><div class="care-icon">${c.ico}</div><h4>${c.t}</h4><p>${c.p}</p></div>`).join('')}</div>`;
}

/* ---- INIT ---- */
document.addEventListener('DOMContentLoaded', () => {
    renderSpotlight();
    renderQuiz();
});