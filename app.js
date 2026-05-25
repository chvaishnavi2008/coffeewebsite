document.addEventListener("DOMContentLoaded", () => {
    // Register GSAP ScrollTrigger
    gsap.registerPlugin(ScrollTrigger);

    /* --- CONSTANTS & STATE --- */
    const TOTAL_FRAMES = 151;
    const images = [];
    const coffeeSequence = { frame: 0 };
    
    let isAutoplayActive = true;
    let autoplayInterval = null;
    let currentAutoplayFrame = 0;
    
    // Elements
    const canvas = document.getElementById("coffee-canvas");
    const ctx = canvas.getContext("2d");
    const preloader = document.getElementById("preloader");
    const loaderBar = document.getElementById("loader-bar");
    const loaderPercent = document.getElementById("loader-percent");

    /* --- IMAGE PRELOADING SYSTEM --- */
    // Helper to pad frame numbers (e.g., 1 -> 001)
    const pad = (num, size) => {
        let s = num + "";
        while (s.length < size) s = "0" + s;
        return s;
    };

    // Generate path for each frame in the workspace folder
    const getFramePath = (index) => {
        return `./ezgif-frame-${pad(index, 3)}.jpg`;
    };

    // Preload all frames
    let loadedCount = 0;
    
    function preloadImages() {
        return new Promise((resolve) => {
            const handleLoadOrError = () => {
                loadedCount++;
                const progress = Math.round((loadedCount / TOTAL_FRAMES) * 100);
                
                // Update loader UI
                loaderBar.style.width = `${progress}%`;
                loaderPercent.textContent = `${progress}%`;
                
                if (loadedCount === TOTAL_FRAMES) {
                    setTimeout(() => {
                        preloader.classList.add("loaded");
                        resolve();
                    }, 500);
                }
            };

            for (let i = 1; i <= TOTAL_FRAMES; i++) {
                const img = new Image();
                img.onload = handleLoadOrError;
                img.onerror = handleLoadOrError;
                img.src = getFramePath(i);
                images.push(img);
            }
        });
    }

    /* --- CANVAS COVER DRAWING --- */
    // Custom function to draw image mimicking "object-fit: cover"
    function drawImageCover(ctx, img) {
        const canvasW = canvas.width;
        const canvasH = canvas.height;
        const imgW = img.width || 800; // fallback default dimensions if not yet ready
        const imgH = img.height || 450;

        const imgRatio = imgW / imgH;
        const canvasRatio = canvasW / canvasH;

        let renderW, renderH, cx, cy;

        if (canvasRatio > imgRatio) {
            renderW = canvasW;
            renderH = canvasW / imgRatio;
            cx = 0;
            cy = (canvasH - renderH) / 2;
        } else {
            renderW = canvasH * imgRatio;
            renderH = canvasH;
            cx = (canvasW - renderW) / 2;
            cy = 0;
        }

        ctx.clearRect(0, 0, canvasW, canvasH);
        ctx.drawImage(img, cx, cy, renderW, renderH);
    }

    // Render a specific frame index
    function renderFrame(index) {
        const frameIndex = Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.floor(index)));
        const img = images[frameIndex];
        if (img && img.complete) {
            drawImageCover(ctx, img);
        }
    }

    // Handle canvas resizing
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        // Re-render current frame immediately to avoid blank or stretched canvas
        if (isAutoplayActive) {
            renderFrame(currentAutoplayFrame);
        } else {
            renderFrame(coffeeSequence.frame);
        }
    }

    window.addEventListener("resize", resizeCanvas);

    /* --- HERO AUTOPLAY LOOP --- */
    function startHeroAutoplay() {
        if (autoplayInterval) clearInterval(autoplayInterval);
        isAutoplayActive = true;
        
        autoplayInterval = setInterval(() => {
            if (!isAutoplayActive) return;
            currentAutoplayFrame = (currentAutoplayFrame + 1) % 45; // Loop the first 45 frames
            renderFrame(currentAutoplayFrame);
        }, 50); // ~20 FPS
    }

    function stopHeroAutoplay() {
        isAutoplayActive = false;
        if (autoplayInterval) {
            clearInterval(autoplayInterval);
            autoplayInterval = null;
        }
    }

    /* --- GSAP SCROLL ANIMATIONS --- */
    function initScrollAnimations() {
        // 1. Navbar Scroll State
        const navbar = document.getElementById("navbar");
        ScrollTrigger.create({
            start: "top -50px",
            onEnter: () => navbar.classList.add("scrolled"),
            onLeaveBack: () => navbar.classList.remove("scrolled")
        });

        // 2. Hero Text Reveals (Apple-style fade & rise)
        gsap.to("#hero-brand", { opacity: 1, y: 0, duration: 1, delay: 0.2 });
        gsap.to("#hero-title", { opacity: 1, y: 0, duration: 1, delay: 0.4 });
        gsap.to("#hero-desc", { opacity: 1, y: 0, duration: 1, delay: 0.6 });
        gsap.to("#hero-btns", { opacity: 1, y: 0, duration: 1, delay: 0.8 });

        // 3. Journey Canvas Pinned & Scrubbing (Frames 45 to 150)
        // Setup pinning of the journey section
        ScrollTrigger.create({
            trigger: "#journey",
            start: "top top",
            end: "bottom bottom",
            pin: true,
            scrub: true,
            onToggle: (self) => {
                if (self.isActive) {
                    stopHeroAutoplay();
                } else if (self.scroll() < self.start) {
                    // Scrolled back up to top, resume autoplay loop
                    startHeroAutoplay();
                }
            }
        });

        // Animate the frame index based on journey scroll
        gsap.to(coffeeSequence, {
            frame: TOTAL_FRAMES - 1,
            ease: "none",
            scrollTrigger: {
                trigger: "#journey",
                start: "top top",
                end: "bottom bottom",
                scrub: 0.1 // subtle smoothing
            },
            onUpdate: () => {
                if (!isAutoplayActive) {
                    renderFrame(coffeeSequence.frame);
                }
            }
        });

        // 4. Reveal Journey Story Steps as User Scrolls
        const journeySteps = document.querySelectorAll(".journey-step");
        
        journeySteps.forEach((step, idx) => {
            const stepNum = idx + 1;
            
            // Activate step overlay texts based on progress
            ScrollTrigger.create({
                trigger: "#journey",
                start: `top+=${(idx * 33)}% top`,
                end: `top+=${((idx + 1) * 33)}% top`,
                onEnter: () => {
                    journeySteps.forEach(s => s.classList.remove("active"));
                    step.classList.add("active");
                },
                onEnterBack: () => {
                    journeySteps.forEach(s => s.classList.remove("active"));
                    step.classList.add("active");
                }
            });
        });

        // 5. General Section Reveals (Fade + Translate)
        const fadeLefts = document.querySelectorAll(".reveal-fade-left");
        fadeLefts.forEach(el => {
            gsap.fromTo(el, 
                { opacity: 0, x: -50 },
                { opacity: 1, x: 0, duration: 1.2, ease: "power3.out", scrollTrigger: {
                    trigger: el,
                    start: "top 80%",
                    toggleActions: "play none none none"
                }}
            );
        });

        const fadeRights = document.querySelectorAll(".reveal-fade-right");
        fadeRights.forEach(el => {
            gsap.fromTo(el, 
                { opacity: 0, x: 50 },
                { opacity: 1, x: 0, duration: 1.2, ease: "power3.out", scrollTrigger: {
                    trigger: el,
                    start: "top 80%",
                    toggleActions: "play none none none"
                }}
            );
        });

        const fadeUps = document.querySelectorAll(".reveal-fade-up");
        fadeUps.forEach(el => {
            gsap.fromTo(el, 
                { opacity: 0, y: 50 },
                { opacity: 1, y: 0, duration: 1.2, ease: "power3.out", scrollTrigger: {
                    trigger: el,
                    start: "top 85%",
                    toggleActions: "play none none none"
                }}
            );
        });

        // 6. Grid Cards Reveal (Staggered glow entry)
        const revealCards = document.querySelectorAll(".reveal-card");
        if (revealCards.length > 0) {
            gsap.fromTo(revealCards, 
                { opacity: 0, y: 40 },
                { opacity: 1, y: 0, duration: 1, stagger: 0.15, ease: "power2.out", scrollTrigger: {
                    trigger: revealCards[0],
                    start: "top 85%"
                }}
            );
        }

        // 7. Navigation Link Active Highlighting
        const sections = document.querySelectorAll("section");
        const navLinks = document.querySelectorAll(".nav-link");

        window.addEventListener("scroll", () => {
            let current = "";
            sections.forEach(section => {
                const sectionTop = section.offsetTop;
                const sectionHeight = section.clientHeight;
                if (window.scrollY >= sectionTop - 120) {
                    current = section.getAttribute("id");
                }
            });

            navLinks.forEach(link => {
                link.classList.remove("active");
                if (link.getAttribute("href").includes(current)) {
                    link.classList.add("active");
                }
            });
        });
    }

    /* --- TESTIMONIAL CAROUSEL --- */
    function initTestimonialCarousel() {
        const track = document.getElementById("testimonials-track");
        const cards = document.querySelectorAll(".testimonial-card");
        const prevBtn = document.getElementById("prev-btn");
        const nextBtn = document.getElementById("next-btn");
        
        if (!track || cards.length === 0) return;

        let currentIndex = 0;
        const totalCards = cards.length;

        function updateSlide() {
            track.style.transform = `translateX(-${currentIndex * 100}%)`;
        }

        nextBtn.addEventListener("click", () => {
            currentIndex = (currentIndex + 1) % totalCards;
            updateSlide();
        });

        prevBtn.addEventListener("click", () => {
            currentIndex = (currentIndex - 1 + totalCards) % totalCards;
            updateSlide();
        });

        // Autoplay carousel every 6 seconds
        setInterval(() => {
            currentIndex = (currentIndex + 1) % totalCards;
            updateSlide();
        }, 6000);
    }

    /* --- RESPONSIVE MENU INTERACTION --- */
    function initMobileMenu() {
        const mobileToggle = document.getElementById("mobile-toggle");
        const navLinksContainer = document.querySelector(".nav-links");

        if (mobileToggle && navLinksContainer) {
            mobileToggle.addEventListener("click", () => {
                navLinksContainer.style.display = 
                    navLinksContainer.style.display === "flex" ? "none" : "flex";
                if (navLinksContainer.style.display === "flex") {
                    navLinksContainer.style.flexDirection = "column";
                    navLinksContainer.style.position = "absolute";
                    navLinksContainer.style.top = "80px";
                    navLinksContainer.style.left = "0";
                    navLinksContainer.style.width = "100%";
                    navLinksContainer.style.background = "var(--bg-glass)";
                    navLinksContainer.style.backdropFilter = "blur(20px)";
                    navLinksContainer.style.padding = "2rem";
                    navLinksContainer.style.borderBottom = "var(--border-glass)";
                    navLinksContainer.style.gap = "1.5rem";
                }
            });

            // Close menu if link is clicked on mobile
            navLinksContainer.querySelectorAll("a").forEach(link => {
                link.addEventListener("click", () => {
                    if (window.innerWidth <= 768) {
                        navLinksContainer.style.display = "none";
                    }
                });
            });
        }
    }

    /* --- MAIN SETUP INITIATOR --- */
    async function init() {
        // 1. Preload image assets
        await preloadImages();
        
        // 2. Initial Canvas Sizing & Drawing First Frame
        resizeCanvas();
        
        // 3. Play Hero loop
        startHeroAutoplay();
        
        // 4. Initialize GSAP Scroll animations
        initScrollAnimations();
        
        // 5. Initialize Testimonials slider
        initTestimonialCarousel();

        // 6. Mobile navigation setup
        initMobileMenu();
    }

    init();
});
