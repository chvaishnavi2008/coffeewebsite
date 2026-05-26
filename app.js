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

        // Use a highly stable, direct public MP3 track
        const audio = new Audio("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3");
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

    /* --- SEED-TO-CUP ROADMAP ANIMATIONS --- */
    function initRoadmapTimeline() {
        const progressLine = document.getElementById("roadmap-progress-line");
        const nodes = document.querySelectorAll(".roadmap-node");
        if (!progressLine || nodes.length === 0) return;

        // Animate vertical connecting progress line on scroll
        gsap.to(progressLine, {
            scaleY: 1,
            ease: "none",
            scrollTrigger: {
                trigger: "#roadmap .roadmap-timeline",
                start: "top 45%",
                end: "bottom 55%",
                scrub: true
            }
        });

        // Trigger active highlights on node elements when they scroll to middle-height of screen
        nodes.forEach(node => {
            ScrollTrigger.create({
                trigger: node,
                start: "top 55%",
                end: "bottom 45%",
                onEnter: () => node.classList.add("active"),
                onLeaveBack: () => node.classList.remove("active"),
                onEnterBack: () => node.classList.add("active")
            });
        });
    }

    /* --- QR MENU & TABLE ORDERING SYSTEM --- */
    let currentTable = null;
    let cart = [];
    let orderTimerInterval = null;

    function initQROrdering() {
        // Detect table parameter in URL
        const urlParams = new URLSearchParams(window.location.search);
        const urlTable = urlParams.get("table");
        
        // Check localStorage for table if URL param isn't set
        const cachedTable = localStorage.getItem("bmm_active_table");
        
        if (urlTable) {
            currentTable = parseInt(urlTable, 10);
            localStorage.setItem("bmm_active_table", currentTable);
        } else if (cachedTable) {
            currentTable = parseInt(cachedTable, 10);
        }

        // Dynamically inject "Add to Order" buttons on all menu cards
        injectOrderButtons();

        // Bind interactive elements
        setupQROrderingEvents();

        // If table is active, set up table state
        if (currentTable) {
            activateTableSession(currentTable);
        } else {
            deactivateTableSession();
        }

        // Initialize QR code generator dashboard
        initQRCodeGenerator();
        
        // Restore running timers if any
        restoreOrderStatus();
    }

    function injectOrderButtons() {
        const cards = document.querySelectorAll(".menu-card");
        cards.forEach(card => {
            const titleEl = card.querySelector("h3");
            const priceEl = card.querySelector(".menu-price");
            if (!titleEl || !priceEl) return;
            
            const name = titleEl.textContent.trim();
            const priceText = priceEl.textContent.trim();
            const price = parseFloat(priceText.replace("$", ""));
            const imgEl = card.querySelector(".menu-img-container img");
            const img = imgEl ? imgEl.src : "";
            
            // Clear but preserve text
            priceEl.innerHTML = `<span>${priceText}</span>`;
            
            // Create "+" button
            const addBtn = document.createElement("button");
            addBtn.className = "btn-add-order";
            addBtn.innerHTML = `
                <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" style="display:inline-block; vertical-align:middle;">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg> Add
            `;
            addBtn.setAttribute("data-name", name);
            addBtn.setAttribute("data-price", price);
            addBtn.setAttribute("data-img", img);
            
            priceEl.appendChild(addBtn);
            
            addBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                addToCart(name, price, img);
            });
        });
    }

    function setupQROrderingEvents() {
        // Floating action buttons
        const floatingCart = document.getElementById("floating-cart");
        const floatingQRHub = document.getElementById("floating-qr-hub");
        
        const cartOverlay = document.getElementById("cart-drawer-overlay");
        const closeCart = document.getElementById("close-cart");
        
        const qrOverlay = document.getElementById("qr-modal-overlay");
        const closeQRModal = document.getElementById("close-qr-modal");
        
        const tableSelectOverlay = document.getElementById("table-select-overlay");
        const closeTableSelect = document.getElementById("close-table-select");
        const tableSelectForm = document.getElementById("table-select-form");
        
        const btnExitTable = document.getElementById("btn-exit-table");
        
        // Cart drawer open/close
        if (floatingCart) {
            floatingCart.addEventListener("click", () => {
                if (currentTable === null) {
                    // Prompt table selection
                    openTableSelector();
                } else {
                    cartOverlay.classList.add("active");
                    renderCart();
                }
            });
        }
        
        if (closeCart) {
            closeCart.addEventListener("click", () => cartOverlay.classList.remove("active"));
        }
        
        if (cartOverlay) {
            cartOverlay.addEventListener("click", (e) => {
                if (e.target === cartOverlay) cartOverlay.classList.remove("active");
            });
        }
        
        // QR Hub generator open/close
        if (floatingQRHub) {
            floatingQRHub.addEventListener("click", () => {
                qrOverlay.classList.add("active");
                regenerateQRCode();
            });
        }
        
        if (closeQRModal) {
            closeQRModal.addEventListener("click", () => qrOverlay.classList.remove("active"));
        }
        
        if (qrOverlay) {
            qrOverlay.addEventListener("click", (e) => {
                if (e.target === qrOverlay) qrOverlay.classList.remove("active");
            });
        }
        
        // Manual Table select overlay
        if (closeTableSelect) {
            closeTableSelect.addEventListener("click", () => tableSelectOverlay.classList.remove("active"));
        }
        
        if (tableSelectOverlay) {
            tableSelectOverlay.addEventListener("click", (e) => {
                if (e.target === tableSelectOverlay) tableSelectOverlay.classList.remove("active");
            });
        }
        
        if (tableSelectForm) {
            tableSelectForm.addEventListener("submit", (e) => {
                e.preventDefault();
                const tableNum = parseInt(document.getElementById("manual-table-num").value, 10);
                if (tableNum > 0 && tableNum <= 50) {
                    currentTable = tableNum;
                    localStorage.setItem("bmm_active_table", currentTable);
                    activateTableSession(currentTable);
                    tableSelectOverlay.classList.remove("active");
                    
                    // Open cart after table is set
                    setTimeout(() => {
                        cartOverlay.classList.add("active");
                        renderCart();
                    }, 300);
                }
            });
        }
        
        // Exit Table Session
        if (btnExitTable) {
            btnExitTable.addEventListener("click", () => {
                if (confirm("Are you sure you want to end your dining session at Table " + currentTable + "?")) {
                    deactivateTableSession();
                }
            });
        }
        
        // Place Order button action
        const placeOrderBtn = document.getElementById("place-order-btn");
        if (placeOrderBtn) {
            placeOrderBtn.addEventListener("click", placeOrder);
        }
        
        // Order Widget Dismiss
        const closeStatusWidget = document.getElementById("close-status-widget");
        if (closeStatusWidget) {
            closeStatusWidget.addEventListener("click", () => {
                document.getElementById("order-status-widget").classList.remove("active");
                localStorage.removeItem("bmm_order_id");
                localStorage.removeItem("bmm_order_expires");
                if (orderTimerInterval) clearInterval(orderTimerInterval);
            });
        }
    }

    function openTableSelector() {
        const tableSelectOverlay = document.getElementById("table-select-overlay");
        if (tableSelectOverlay) {
            tableSelectOverlay.classList.add("active");
            document.getElementById("manual-table-num").focus();
        }
    }

    function activateTableSession(tableNum) {
        currentTable = tableNum;
        
        // Show Active Pill
        const activePill = document.getElementById("active-table-pill");
        const activePillNum = document.getElementById("active-table-number");
        if (activePill && activePillNum) {
            activePillNum.textContent = tableNum;
            activePill.classList.add("active");
        }
        
        // Update labels
        const cartLabel = document.getElementById("cart-table-label");
        if (cartLabel) {
            cartLabel.textContent = `Table ${tableNum}`;
        }
        
        // Load table cart from localStorage
        const storedCart = localStorage.getItem("bmm_cart_table_" + tableNum);
        if (storedCart) {
            cart = JSON.parse(storedCart);
        } else {
            cart = [];
        }
        
        updateBadgeCount();
    }

    function deactivateTableSession() {
        // Clear variables
        localStorage.removeItem("bmm_active_table");
        currentTable = null;
        cart = [];
        
        // Hide pill
        const activePill = document.getElementById("active-table-pill");
        if (activePill) activePill.classList.remove("active");
        
        // Update badge
        updateBadgeCount();
        
        // Close overlays
        document.getElementById("cart-drawer-overlay").classList.remove("active");
        
        // Clean URL
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete("table");
        window.history.replaceState({}, document.title, cleanUrl.toString());
    }

    function addToCart(name, price, img) {
        if (currentTable === null) {
            openTableSelector();
            return;
        }

        const existingItem = cart.find(item => item.name === name);
        if (existingItem) {
            existingItem.qty++;
        } else {
            cart.push({ name, price, img, qty: 1 });
        }

        // Save
        localStorage.setItem("bmm_cart_table_" + currentTable, JSON.stringify(cart));
        
        // Update Badge and animate floating cart button
        updateBadgeCount();
        
        const floatingCart = document.getElementById("floating-cart");
        if (floatingCart) {
            gsap.fromTo(floatingCart, 
                { scale: 1 }, 
                { scale: 1.2, duration: 0.15, yoyo: true, repeat: 1, ease: "power1.out" }
            );
        }
        
        // Render if drawer is open
        if (document.getElementById("cart-drawer-overlay").classList.contains("active")) {
            renderCart();
        }
    }

    function renderCart() {
        const cartItemsContainer = document.getElementById("cart-items");
        if (!cartItemsContainer) return;
        
        cartItemsContainer.innerHTML = "";
        
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = `<div class="empty-cart-msg">Your cart is empty. Tap the "+" on menu items to add them!</div>`;
            updatePrices(0);
            return;
        }

        let subtotal = 0;
        
        cart.forEach(item => {
            subtotal += item.price * item.qty;
            
            const cartItem = document.createElement("div");
            cartItem.className = "cart-item";
            cartItem.innerHTML = `
                <div class="cart-item-img">
                    <img src="${item.img}" alt="${item.name}">
                </div>
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <div class="cart-item-price">$${(item.price).toFixed(2)}</div>
                </div>
                <div class="cart-item-qty-controls">
                    <button class="qty-btn dec-btn" data-name="${item.name}">-</button>
                    <span class="qty-val">${item.qty}</span>
                    <button class="qty-btn inc-btn" data-name="${item.name}">+</button>
                </div>
                <button class="btn-remove-item" data-name="${item.name}" aria-label="Remove item">
                    <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                </button>
            `;
            cartItemsContainer.appendChild(cartItem);
        });

        // Add event listeners for controls
        cartItemsContainer.querySelectorAll(".dec-btn").forEach(btn => {
            btn.addEventListener("click", () => adjustQty(btn.getAttribute("data-name"), -1));
        });
        
        cartItemsContainer.querySelectorAll(".inc-btn").forEach(btn => {
            btn.addEventListener("click", () => adjustQty(btn.getAttribute("data-name"), 1));
        });
        
        cartItemsContainer.querySelectorAll(".btn-remove-item").forEach(btn => {
            btn.addEventListener("click", () => adjustQty(btn.getAttribute("data-name"), "remove"));
        });

        updatePrices(subtotal);
    }

    function adjustQty(name, amount) {
        const itemIdx = cart.findIndex(item => item.name === name);
        if (itemIdx === -1) return;

        if (amount === "remove") {
            cart.splice(itemIdx, 1);
        } else {
            cart[itemIdx].qty += amount;
            if (cart[itemIdx].qty <= 0) {
                cart.splice(itemIdx, 1);
            }
        }

        localStorage.setItem("bmm_cart_table_" + currentTable, JSON.stringify(cart));
        updateBadgeCount();
        renderCart();
    }

    function updatePrices(subtotal) {
        const taxRate = 0.08;
        const tax = subtotal * taxRate;
        const total = subtotal + tax;

        document.getElementById("cart-subtotal").textContent = `$${subtotal.toFixed(2)}`;
        document.getElementById("cart-tax").textContent = `$${tax.toFixed(2)}`;
        document.getElementById("cart-total").textContent = `$${total.toFixed(2)}`;
    }

    function updateBadgeCount() {
        const count = cart.reduce((acc, item) => acc + item.qty, 0);
        const badge = document.getElementById("cart-badge-count");
        if (badge) {
            badge.textContent = count;
            if (count > 0) {
                badge.classList.add("active");
            } else {
                badge.classList.remove("active");
            }
        }
    }

    /* Print / Download / Generator QR Controller */
    let qrcodeInstance = null;

    function initQRCodeGenerator() {
        const select = document.getElementById("qr-table-select");
        if (select) {
            select.addEventListener("change", regenerateQRCode);
        }

        const btnSimulate = document.getElementById("btn-simulate-scan");
        if (btnSimulate) {
            btnSimulate.addEventListener("click", () => {
                const tableNum = document.getElementById("qr-table-select").value;
                const cleanUrl = new URL(window.location.href);
                cleanUrl.searchParams.set("table", tableNum);
                
                // Hide modal
                document.getElementById("qr-modal-overlay").classList.remove("active");
                
                // Trigger transitions and route
                gsap.to(window, {
                    scrollTo: "#menu",
                    duration: 1.2,
                    ease: "power3.inOut",
                    onComplete: () => {
                        window.location.href = cleanUrl.toString();
                    }
                });
            });
        }

        const btnDownload = document.getElementById("btn-download-qr");
        if (btnDownload) {
            btnDownload.addEventListener("click", downloadQRCode);
        }

        const btnPrint = document.getElementById("btn-print-qr");
        if (btnPrint) {
            btnPrint.addEventListener("click", () => {
                window.print();
            });
        }
    }

    function regenerateQRCode() {
        const tableNum = document.getElementById("qr-table-select").value;
        const currentUrl = new URL(window.location.href);
        currentUrl.search = "";
        currentUrl.searchParams.set("table", tableNum);
        
        document.getElementById("qr-card-table-num").textContent = `Table ${tableNum}`;
        
        const container = document.getElementById("qr-code-element");
        if (!container) return;
        
        container.innerHTML = "";
        
        qrcodeInstance = new QRCode(container, {
            text: currentUrl.toString(),
            width: 256,
            height: 256,
            colorDark: "#14100d",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    }

    function downloadQRCode() {
        const tableNum = document.getElementById("qr-table-select").value;
        const canvas = document.querySelector("#qr-code-element canvas");
        const img = document.querySelector("#qr-code-element img");
        
        let dataUrl = "";
        if (canvas) {
            dataUrl = canvas.toDataURL("image/png");
        } else if (img && img.src && img.src.startsWith("data:image")) {
            dataUrl = img.src;
        }

        if (dataUrl) {
            const link = document.createElement("a");
            link.href = dataUrl;
            link.download = `bmm_table_${tableNum}_qr.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            alert("Generating QR Code... please click again.");
        }
    }

    /* Place simulated kitchen order */
    function placeOrder() {
        if (cart.length === 0) {
            alert("Your cart is empty! Please add some brews first.");
            return;
        }

        const stepper = document.getElementById("checkout-stepper");
        const title = document.getElementById("stepper-title");
        const desc = document.getElementById("stepper-desc");
        const circle = document.querySelector(".stepper-spinner circle");
        
        const node1 = document.getElementById("step-node-1");
        const node2 = document.getElementById("step-node-2");
        const node3 = document.getElementById("step-node-3");

        // Open Stepper Panel
        stepper.className = "checkout-stepper-overlay active";
        
        // Reset steps
        node1.className = "step-node active";
        node2.className = "step-node";
        node3.className = "step-node";
        
        title.textContent = "Connecting to Barista";
        desc.textContent = "Transmitting order to the bar kitchen server...";
        
        circle.style.strokeDashoffset = 283;
        
        const tl = gsap.timeline();
        
        // Step 1: Sending Order
        tl.to(circle, {
            strokeDashoffset: 190,
            duration: 1.5,
            ease: "none",
            onComplete: () => {
                node1.className = "step-node completed";
                node2.className = "step-node active";
                title.textContent = "Barista Reviewing";
                desc.textContent = "Your barista is calibrating extraction temp & pressure variables...";
            }
        });
        
        // Step 2: Barista Accepting
        tl.to(circle, {
            strokeDashoffset: 95,
            duration: 2.0,
            ease: "none",
            onComplete: () => {
                node2.className = "step-node completed";
                node3.className = "step-node active";
                title.textContent = "Finalizing Extraction Setup";
                desc.textContent = "Grinding fresh single-origin beans and pre-heating cups...";
            }
        });
        
        // Step 3: Preparing
        tl.to(circle, {
            strokeDashoffset: 0,
            duration: 1.5,
            ease: "none",
            onComplete: () => {
                node3.className = "step-node completed";
                stepper.classList.add("success");
                title.textContent = "Order Confirmed!";
                desc.textContent = `Order placed for Table ${currentTable}! Estimated delivery: 5 minutes.`;
                
                // Clear cart state
                cart = [];
                localStorage.removeItem("bmm_cart_table_" + currentTable);
                updateBadgeCount();
                
                // Set Order status tracking
                const orderId = `BMM-${Math.floor(1000 + Math.random() * 9000)}`;
                const expiresAt = Date.now() + 5 * 60 * 1000;
                localStorage.setItem("bmm_order_id", orderId);
                localStorage.setItem("bmm_order_expires", expiresAt);
                
                // Trigger order tracking widget
                setTimeout(() => {
                    stepper.className = "checkout-stepper-overlay";
                    document.getElementById("cart-drawer-overlay").classList.remove("active");
                    startOrderStatusTimer(orderId, expiresAt);
                }, 2000);
            }
        });
    }

    function startOrderStatusTimer(orderId, expiresAt) {
        const widget = document.getElementById("order-status-widget");
        const title = document.getElementById("order-widget-title");
        const timerText = document.getElementById("order-widget-timer");
        
        if (!widget || !title || !timerText) return;
        
        title.textContent = `Order #${orderId}`;
        widget.classList.add("active");
        
        if (orderTimerInterval) clearInterval(orderTimerInterval);
        
        function updateTimer() {
            const remaining = expiresAt - Date.now();
            if (remaining <= 0) {
                timerText.innerHTML = "Status: Ready! Enjoy your brew ☕";
                timerText.style.color = "#5dc87b";
                widget.style.borderColor = "#5dc87b";
                clearInterval(orderTimerInterval);
            } else {
                const minutes = Math.floor(remaining / 60000);
                const seconds = Math.floor((remaining % 60000) / 1000);
                timerText.textContent = `Status: Preparing (${minutes}:${seconds < 10 ? '0' : ''}${seconds})`;
            }
        }
        
        updateTimer();
        orderTimerInterval = setInterval(updateTimer, 1000);
    }

    function restoreOrderStatus() {
        const orderId = localStorage.getItem("bmm_order_id");
        const expiresAt = localStorage.getItem("bmm_order_expires");
        
        if (orderId && expiresAt) {
            const expires = parseInt(expiresAt, 10);
            if (expires > Date.now()) {
                startOrderStatusTimer(orderId, expires);
            } else {
                localStorage.removeItem("bmm_order_id");
                localStorage.removeItem("bmm_order_expires");
            }
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

        // 7. Phase 2 & 3 Premium Features
        initCustomCursor();
        initAudioPlayer();
        initMenuFiltering();
        initBookingModal();
        initNewsletterForm();
        initRoadmapTimeline();

        // 8. QR Menu & Table Ordering initialization
        initQROrdering();
    }

    init();
});
