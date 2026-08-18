console.log("VibeFlow is running");

let songs = [];
let currFolder;
let currentsong = new Audio();

const WAVE_BAR_COUNT = 64;
// Deterministic pseudo-random heights so the waveform looks organic
// but doesn't reshuffle every render.
const WAVE_HEIGHTS = Array.from({ length: WAVE_BAR_COUNT }, (_, i) => {
    const wobble = Math.sin(i * 1.3) * 0.5 + Math.sin(i * 0.47) * 0.3;
    return Math.round(22 + Math.abs(wobble) * 70); // 22% - 100%
});

function buildWaveform() {
    const seek = document.getElementById("deckSeek");
    seek.innerHTML = "";
    for (let i = 0; i < WAVE_BAR_COUNT; i++) {
        const bar = document.createElement("div");
        bar.className = "wbar";
        bar.style.height = WAVE_HEIGHTS[i] + "%";
        seek.appendChild(bar);
    }
}

function updateWaveformProgress(percent) {
    const bars = document.querySelectorAll(".deck-seek .wbar");
    const filledCount = Math.round((percent / 100) * bars.length);
    bars.forEach((bar, i) => {
        bar.classList.toggle("filled", i < filledCount);
    });
}

async function getSongs(folder) {
    currFolder = folder;
    let a = await fetch(`http://127.0.0.1:3002/${folder}/`);
    let response = await a.text();
    let div = document.createElement("div");
    div.innerHTML = response;
    let as = div.getElementsByTagName("a");
    songs = [];
    for (let index = 0; index < as.length; index++) {
        const e = as[index];
        if (e.href.endsWith(".mp3")) {
            songs.push(e.href.split(`/${folder}/`)[1]);
        }
    }

    // Render the queue in the rail
    let trackList = document.querySelector(".trackList");
    trackList.innerHTML = "";
    songs.forEach((song, i) => {
        const title = decodeURIComponent(song.replaceAll("%20", " "));
        trackList.innerHTML += `<li data-track="${song}">
            <span class="track-note">${String(i + 1).padStart(2, "0")}</span>
            <div class="info">
                <div class="track-title">${title}</div>
                <div class="track-sub">Track ${i + 1}</div>
            </div>
            <div class="playnow">
                <span>Play</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M7 5L19 12L7 19V5Z" fill="currentColor" />
                </svg>
            </div>
        </li>`;
    });

    Array.from(trackList.getElementsByTagName("li")).forEach((li) => {
        li.addEventListener("click", () => {
            playMusic(li.dataset.track);
        });
    });

    return songs;
}

function formatTime(seconds) {
    if (!isFinite(seconds) || isNaN(seconds)) return "00:00";
    let minutes = Math.floor(seconds / 60);
    let remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
}

const playIconPaths = {
    play: `<path d="M7 5L19 12L7 19V5Z" fill="currentColor" />`,
    pause: `<rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" />
            <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" />`
};

function setPlayIcon(state) {
    document.getElementById("playIcon").innerHTML = playIconPaths[state];
}

const playMusic = (track, pause = false) => {
    currentsong.src = `/${currFolder}/` + track;
    if (!pause) {
        currentsong.play();
        setPlayIcon("pause");
    } else {
        setPlayIcon("play");
    }

    document.querySelector(".songinfo").innerHTML = decodeURI(track);
    document.querySelector(".songtime").innerHTML = "00:00 / 00:00";
    updateWaveformProgress(0);
};

async function displayAlbums() {
    let a = await fetch(`http://127.0.0.1:3002/songs/`);
    let response = await a.text();
    let div = document.createElement("div");
    div.innerHTML = response;
    let anchors = div.getElementsByTagName("a");
    let cardContainer = document.querySelector(".cardContainer");
    cardContainer.innerHTML = "";
    let array = Array.from(anchors);
    let crateCount = 0;

    for (let index = 0; index < array.length; index++) {
        const e = array[index];
        if (e.href.includes("/songs") && !e.href.includes(".DS_Store")) {
            let folder = e.href.split("/").slice(-2)[0];

            let meta = { title: folder, description: "A VibeFlow crate" };
            try {
                let metaRes = await fetch(`http://127.0.0.1:3002/songs/${folder}/info.json`);
                meta = await metaRes.json();
            } catch (err) {
                console.warn(`No info.json for crate "${folder}", using defaults.`);
            }

            crateCount++;
            cardContainer.innerHTML += `<div data-folder="${folder}" class="card">
                <div class="card-art">
                    <img src="songs/${folder}/cover.jpg" alt="" onerror="this.style.display='none'">
                    <div class="card-play">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d="M7 5L19 12L7 19V5Z" fill="currentColor" />
                        </svg>
                    </div>
                </div>
                <h3>${meta.title}</h3>
                <p>${meta.description}</p>
            </div>`;
        }
    }

    document.getElementById("crateCount").textContent =
        crateCount === 1 ? "1 crate" : `${crateCount} crates`;

    Array.from(document.getElementsByClassName("card")).forEach((card) => {
        card.addEventListener("click", async (item) => {
            const folder = item.currentTarget.dataset.folder;
            const list = await getSongs(`songs/${folder}`);
            if (list.length) playMusic(list[0]);
        });
    });
}

async function main() {
    buildWaveform();

    await getSongs("songs/ncs");
    if (songs.length) playMusic(songs[0], true);

    displayAlbums();

    // Play / pause
    document.getElementById("play").addEventListener("click", () => {
        if (currentsong.paused) {
            currentsong.play();
            setPlayIcon("pause");
        } else {
            currentsong.pause();
            setPlayIcon("play");
        }
    });

    // Progress
    currentsong.addEventListener("timeupdate", () => {
        document.querySelector(".songtime").innerHTML =
            `${formatTime(currentsong.currentTime)} / ${formatTime(currentsong.duration)}`;
        const percent = (currentsong.currentTime / currentsong.duration) * 100 || 0;
        updateWaveformProgress(percent);
    });

    // Seek via waveform
    document.getElementById("deckSeek").addEventListener("click", (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const percent = ((e.clientX - rect.left) / rect.width) * 100;
        updateWaveformProgress(percent);
        currentsong.currentTime = (currentsong.duration * percent) / 100;
    });

    // Rail open/close (mobile)
    document.getElementById("railToggle").addEventListener("click", () => {
        document.getElementById("rail").classList.add("open");
    });
    document.getElementById("railClose").addEventListener("click", () => {
        document.getElementById("rail").classList.remove("open");
    });

    // Previous / next
    document.getElementById("previous").addEventListener("click", () => {
        if (!songs || songs.length === 0) return;
        let currentTrack = decodeURIComponent(currentsong.src.split("/").slice(-1)[0]);
        let index = songs.findIndex((s) => decodeURIComponent(s) === currentTrack);
        if (index - 1 >= 0) {
            playMusic(songs[index - 1]);
        }
    });

    document.getElementById("next").addEventListener("click", () => {
        if (!songs || songs.length === 0) return;
        let currentTrack = decodeURIComponent(currentsong.src.split("/").slice(-1)[0]);
        let index = songs.findIndex((s) => decodeURIComponent(s) === currentTrack);
        if (index + 1 < songs.length) {
            playMusic(songs[index + 1]);
        }
    });

    // Volume
    const volumeSlider = document.getElementById("volumeSlider");
    volumeSlider.addEventListener("input", (e) => {
        currentsong.volume = parseInt(e.target.value) / 100;
    });

    document.getElementById("volumeIcon").addEventListener("click", (e) => {
        const icon = e.currentTarget;
        const isMuted = icon.dataset.muted === "true";
        if (!isMuted) {
            icon.dataset.muted = "true";
            currentsong.volume = 0;
            volumeSlider.value = 0;
            icon.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M4 9V15H8L13 20V4L8 9H4Z" fill="currentColor" />
                <path d="M16 9L20 15M20 9L16 15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            </svg>`;
        } else {
            icon.dataset.muted = "false";
            currentsong.volume = 0.10;
            volumeSlider.value = 10;
            icon.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M4 9V15H8L13 20V4L8 9H4Z" fill="currentColor" />
                <path d="M16.5 8.5C17.5 9.6 18 10.7 18 12C18 13.3 17.5 14.4 16.5 15.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            </svg>`;
        }
    });

    currentsong.volume = 0.10;
}

main();
