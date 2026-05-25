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

    /* --- CUSTOM CURSOR --- */
    function initCustomCursor() {
        const dot = document.getElementById("custom-cursor-dot");
        const ring = document.getElementById("custom-cursor-ring");
        if (!dot || !ring) return;

        let mouseX = 0;
        let mouseY = 0;
        let ringX = 0;
        let ringY = 0;

        window.addEventListener("mousemove", (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        function tick() {
            // Instant tracking for center dot
            dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
            
            // Lerp tracking (inertia/lag) for outer ring
            ringX += (mouseX - ringX) * 0.15;
            ringY += (mouseY - ringY) * 0.15;
            ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
            
            requestAnimationFrame(tick);
        }
        tick();

        // Hover expansions using event delegation
        document.addEventListener("mouseover", (e) => {
            const target = e.target.closest("a, button, input, select, textarea, .gallery-item, .carousel-btn");
            if (target) {
                ring.classList.add("hovering");
            } else {
                ring.classList.remove("hovering");
            }
        });
    }

    /* --- AMBIENT AUDIO PLAYER --- */
    function initAudioPlayer() {
        const audioToggle = document.getElementById("audio-toggle");
        if (!audioToggle) return;

        // Soft, relaxing royalty-free ambient lofi track from Mixkit
        const audio = new Audio("https://assets.mixkit.co/music/preview/mixkit-lo-fi-night-walk-357.mp3");
        audio.loop = true;
        audio.volume = 0.25;

        audioToggle.addEventListener("click", () => {
            if (audio.paused) {
                audio.play().then(() => {
                    audioToggle.classList.add("playing");
                }).catch(err => {
                    console.log("Audio playback blocked or failed:", err);
                });
            } else {
                audio.pause();
                audioToggle.classList.remove("playing");
            }
        });
    }

    /* --- MENU CATEGORY FILTERING --- */
    function initMenuFiltering() {
        const filterBtns = document.querySelectorAll(".filter-btn");
        const menuCards = document.querySelectorAll(".menu-card");
        if (filterBtns.length === 0 || menuCards.length === 0) return;

        filterBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                filterBtns.forEach(b => b.classList.remove("active"));
                btn.classList.add("active");

                const category = btn.getAttribute("data-filter");

                // Fade out current cards
                gsap.to(menuCards, {
                    opacity: 0,
                    scale: 0.95,
                    duration: 0.3,
                    stagger: 0.03,
                    ease: "power2.inOut",
                    onComplete: () => {
                        const visibleCards = [];
                        menuCards.forEach(card => {
                            const cardCat = card.getAttribute("data-category");
                            if (category === "all" || cardCat === category) {
                                card.style.display = "block";
                                visibleCards.push(card);
                            } else {
                                card.style.display = "none";
                            }
                        });

                        // Fade in visible cards
                        if (visibleCards.length > 0) {
                            gsap.fromTo(visibleCards,
                                { opacity: 0, scale: 0.95 },
                                { opacity: 1, scale: 1, duration: 0.4, stagger: 0.05, ease: "power2.out", clearProps: "transform" }
                            );
                        }
                    }
                });
            });
        });
    }

    /* --- RESERVATION MODAL --- */
    function initBookingModal() {
        const openBtn = document.getElementById("open-booking");
        const overlay = document.getElementById("booking-overlay");
        const closeBtn = document.getElementById("close-booking");
        const form = document.getElementById("booking-form");
        const formSide = document.getElementById("booking-form-side");
        const successSide = document.getElementById("booking-success-side");

        if (!openBtn || !overlay || !closeBtn || !form) return;

        // Open
        openBtn.addEventListener("click", () => {
            overlay.classList.add("active");
            // Set default date to tomorrow
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            document.getElementById("book-date").value = tomorrow.toISOString().split("T")[0];
            document.getElementById("book-time").value = "18:00";
        });

        // Close functions
        const closeModal = () => {
            overlay.classList.remove("active");
            // Reset modal side panels after transition completes
            setTimeout(() => {
                formSide.classList.remove("inactive");
                successSide.classList.remove("active");
                form.reset();
            }, 500);
        };

        closeBtn.addEventListener("click", closeModal);
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) closeModal();
        });

        // Form Submission
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            
            const rawDate = document.getElementById("book-date").value;
            const rawTime = document.getElementById("book-time").value;

            // Format date & time beautifully
            const dateObj = new Date(rawDate + "T" + rawTime);
            const formattedDate = dateObj.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
            const formattedTime = dateObj.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

            document.getElementById("summary-date").textContent = formattedDate;
            document.getElementById("summary-time").textContent = formattedTime;

            // Trigger animations
            formSide.classList.add("inactive");
            successSide.classList.add("active");
        });
    }

    /* --- NEWSLETTER FOOTER FORM --- */
    function initNewsletterForm() {
        const form = document.getElementById("newsletter-form");
        const successMsg = document.getElementById("newsletter-success");
        if (!form || !successMsg) return;

        form.addEventListener("submit", (e) => {
            e.preventDefault();
            const input = form.querySelector("input");
            const btn = form.querySelector("button");

            // Animate submission effect
            btn.style.pointerEvents = "none";
            btn.textContent = "✓";
            
            gsap.to(input, {
                borderColor: "var(--accent-gold)",
                opacity: 0.7,
                duration: 0.4
            });

            setTimeout(() => {
                form.style.display = "none";
                successMsg.style.display = "block";
            }, 800);
        });
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

        // 7. Phase 2 Premium Features
        initCustomCursor();
        initAudioPlayer();
        initMenuFiltering();
        initBookingModal();
        initNewsletterForm();
    }

    init();
});
