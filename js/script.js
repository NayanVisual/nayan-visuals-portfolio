let allVideos = [];
let currentFilter = 'all';

function toggleMenu() {
    const nav = document.getElementById('navLinks');
    const toggle = document.querySelector('.menu-toggle');
    nav.classList.toggle('active');
    toggle.classList.toggle('active');
    document.body.style.overflow = nav.classList.contains('active') ? 'hidden' : '';
}

function closeMenu() {
    document.getElementById('navLinks').classList.remove('active');
    document.querySelector('.menu-toggle').classList.remove('active');
    document.body.style.overflow = '';
}

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const delay = entry.target.dataset.delay || 0;
            setTimeout(() => entry.target.classList.add('visible'), delay);
            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

function observeHidden() {
    document.querySelectorAll('.hidden:not(.observed)').forEach((el, i) => {
        el.classList.add('observed');
        el.dataset.delay = (i % 6) * 80;
        observer.observe(el);
    });
}

function handleSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const original = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    btn.disabled = true;
    setTimeout(() => {
        btn.innerHTML = '<i class="fas fa-check"></i> Sent!';
        setTimeout(() => {
            btn.innerHTML = original;
            btn.disabled = false;
            e.target.reset();
        }, 1500);
    }, 1200);
}

async function loadPortfolio() {
    const grid = document.getElementById('portfolioGrid');
    grid.innerHTML = `
        <div class="portfolio-loader">
            <div class="spinner"></div>
            <span>Loading portfolio...</span>
        </div>
    `;
    try {
        const res = await fetch('data/portfolio.json');
        if (!res.ok) throw new Error('Network error');
        const data = await res.json();
        allVideos = data;
        renderPortfolio(allVideos);
    } catch (err) {
        console.error('Failed to load portfolio:', err);
        grid.innerHTML = `
            <div class="portfolio-empty">
                <i class="fas fa-exclamation-circle"></i>
                <span>Failed to load portfolio. Check console.</span>
            </div>
        `;
    }
}

function renderPortfolio(videos) {
    const grid = document.getElementById('portfolioGrid');
    if (!grid) return;

    if (!videos.length) {
        grid.innerHTML = `
            <div class="portfolio-empty">
                <i class="fas fa-folder-open"></i>
                <span>No videos in this category yet.</span>
            </div>
        `;
        return;
    }

    grid.innerHTML = videos.map((v, i) => `
        <div class="portfolio-item hidden" data-id="${v.id}" style="transition-delay:${i * 60}ms">
            <div class="placeholder">
                <i class="fas ${v.icon || 'fa-play-circle'}"></i>
                <span>${v.title}</span>
            </div>
            <div class="portfolio-overlay">
                <h4>${v.title}</h4>
                <p>${v.description}</p>
            </div>
        </div>
    `).join('');

    observeHidden();

    grid.querySelectorAll('.portfolio-item').forEach(item => {
        item.addEventListener('click', () => {
            const id = parseInt(item.dataset.id);
            const video = allVideos.find(v => v.id === id);
            if (video) openLightbox(video);
        });
    });
}

function setFilter(filter) {
    currentFilter = filter;

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });

    const filtered = filter === 'all'
        ? allVideos
        : allVideos.filter(v => v.category === filter);

    renderPortfolio(filtered);
    document.getElementById('portfolio').scrollIntoView({ behavior: 'smooth' });
}

function openLightbox(video) {
    const lightbox = document.getElementById('lightbox');
    const embed = document.getElementById('lightboxEmbed');
    const title = document.getElementById('lightboxTitle');
    const desc = document.getElementById('lightboxDesc');

    title.textContent = video.title;
    desc.textContent = video.description;

    if (video.videoUrl) {
        embed.innerHTML = `<iframe src="${video.videoUrl}" allowfullscreen loading="lazy"></iframe>`;
    } else {
        embed.innerHTML = `
            <div class="lightbox-placeholder">
                <i class="fas fa-play-circle"></i>
                <h3>${video.title}</h3>
                <p>${video.description}</p>
            </div>
        `;
    }

    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    const embed = document.getElementById('lightboxEmbed');
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
    setTimeout(() => {
        const iframe = embed.querySelector('iframe');
        if (iframe) {
            const src = iframe.src;
            iframe.src = '';
            iframe.src = src;
        }
    }, 300);
}

document.addEventListener('click', (e) => {
    const nav = document.getElementById('navLinks');
    if (nav.classList.contains('active') && !e.target.closest('nav')) {
        closeMenu();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
});

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => setFilter(btn.dataset.filter));
    });

    observeHidden();

    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-links a');

    function updateActiveLink() {
        let current = '';
        sections.forEach(section => {
            const top = section.offsetTop - 120;
            if (window.scrollY >= top) current = section.getAttribute('id');
        });
        navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
        });
    }

    window.addEventListener('scroll', updateActiveLink, { passive: true });
    updateActiveLink();

    const nav = document.querySelector('nav');
    window.addEventListener('scroll', () => {
        nav.classList.toggle('scrolled', window.scrollY > 60);
    }, { passive: true });

    loadPortfolio();
});
