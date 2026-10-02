// ============================================================
// Transaction Categorizer
// Multi-stage classification with user corrections learning
// ============================================================

class TransactionCategorizer {
    constructor() {
        this.categories = {
            'Food & Dining': {
                color: '#d97706',
                bgColor: '#fef3c7',
                icon: 'utensils',
                keywords: ['restaurant', 'cafe', 'coffee', 'pizza', 'burger', 'sushi', 'thai', 'chinese',
                    'mexican', 'italian', 'bakery', 'diner', 'grill', 'bistro', 'bar', 'pub', 'food',
                    'eat', 'kitchen', 'taco', 'noodle', 'ramen', 'deli', 'sandwich', 'brunch', 'lunch'],
                merchants: ['starbucks', 'mcdonalds', 'subway', 'chipotle', 'dominos', 'papa johns',
                    'wendys', 'burger king', 'taco bell', 'chick-fil-a', 'panera', 'dunkin', 'kfc',
                    'popeyes', 'five guys', 'shake shack', 'sweetgreen', 'panda express',
                    'olive garden', 'applebees', 'ihop', 'grubhub', 'doordash', 'uber eats',
                    'postmates', 'waffle house', 'cheesecake factory', 'red lobster', 'outback']
            },
            'Groceries': {
                color: '#059669',
                bgColor: '#d1fae5',
                icon: 'shopping-cart',
                keywords: ['grocery', 'supermarket', 'market', 'organic', 'fresh', 'produce', 'farm'],
                merchants: ['walmart grocery', 'whole foods', 'trader joes', 'costco', 'kroger',
                    'safeway', 'aldi', 'publix', 'wegmans', 'h-e-b', 'meijer', 'food lion',
                    'giant', 'stop and shop', 'sprouts', 'harris teeter', 'instacart', 'amazon fresh']
            },
            'Transportation': {
                color: '#0284c7',
                bgColor: '#e0f2fe',
                icon: 'car',
                keywords: ['gas', 'fuel', 'parking', 'toll', 'auto', 'car wash', 'vehicle', 'tire',
                    'mechanic', 'oil change', 'transit', 'metro', 'bus', 'train', 'taxi', 'cab',
                    'ev charging', 'registration'],
                merchants: ['uber', 'lyft', 'shell', 'chevron', 'bp', 'exxon', 'mobil', 'sunoco',
                    'citgo', 'wawa', 'speedway', 'valero', 'marathon', 'getaround', 'zipcar',
                    'lime', 'bird', 'tesla supercharger']
            },
            'Shopping': {
                color: '#7c3aed',
                bgColor: '#ede9fe',
                icon: 'shopping-bag',
                keywords: ['shop', 'store', 'mall', 'outlet', 'retail', 'clothing', 'shoes', 'fashion',
                    'apparel', 'accessories', 'jewelry', 'electronics', 'gadget', 'furniture',
                    'home', 'decor', 'hardware'],
                merchants: ['amazon', 'ebay', 'etsy', 'best buy', 'apple store', 'nike', 'adidas',
                    'zara', 'h&m', 'uniqlo', 'nordstrom', 'macys', 'gap', 'old navy', 'home depot',
                    'lowes', 'ikea', 'wayfair', 'walmart', 'target', 'pottery barn',
                    'crate barrel', 'williams sonoma', 'tj maxx', 'marshalls', 'ross']
            },
            'Entertainment': {
                color: '#ea580c',
                bgColor: '#ffedd5',
                icon: 'film',
                keywords: ['movie', 'cinema', 'theater', 'concert', 'show', 'game', 'sport', 'museum',
                    'amusement', 'park', 'zoo', 'aquarium', 'bowling', 'arcade', 'streaming',
                    'ticket', 'comedy', 'karaoke'],
                merchants: ['netflix', 'spotify', 'hulu', 'disney plus', 'hbo max', 'apple tv',
                    'youtube premium', 'twitch', 'steam', 'playstation', 'xbox', 'nintendo',
                    'amc theaters', 'regal', 'cinemark', 'ticketmaster', 'stubhub', 'eventbrite',
                    'fandango', 'crunchyroll']
            },
            'Bills & Utilities': {
                color: '#475569',
                bgColor: '#f1f5f9',
                icon: 'file-text',
                keywords: ['electric', 'water', 'gas bill', 'internet', 'wifi', 'cable', 'phone',
                    'mobile', 'cell', 'insurance', 'rent', 'mortgage', 'hoa', 'utility',
                    'sewage', 'trash', 'waste', 'billing'],
                merchants: ['at&t', 'verizon', 't-mobile', 'sprint', 'comcast', 'xfinity',
                    'spectrum', 'cox', 'progressive', 'state farm', 'geico', 'allstate',
                    'duke energy', 'pg&e', 'con edison', 'national grid', 'mint mobile']
            },
            'Health & Fitness': {
                color: '#0d9488',
                bgColor: '#ccfbf1',
                icon: 'activity',
                keywords: ['gym', 'fitness', 'health', 'medical', 'doctor', 'hospital', 'pharmacy',
                    'drug', 'prescription', 'dental', 'dentist', 'vision', 'eye', 'therapy',
                    'wellness', 'vitamin', 'supplement', 'yoga', 'pilates', 'clinic'],
                merchants: ['cvs', 'walgreens', 'rite aid', 'planet fitness', 'la fitness',
                    'equinox', '24 hour fitness', 'anytime fitness', 'orangetheory', 'peloton',
                    'fitbit', 'headspace', 'calm', 'myfitnesspal']
            },
            'Travel': {
                color: '#2563eb',
                bgColor: '#dbeafe',
                icon: 'plane',
                keywords: ['hotel', 'motel', 'resort', 'flight', 'airline', 'airport', 'cruise',
                    'vacation', 'travel', 'booking', 'hostel', 'lodge', 'inn', 'airbnb', 'vrbo'],
                merchants: ['delta', 'united airlines', 'american airlines', 'southwest',
                    'jetblue', 'spirit airlines', 'frontier', 'marriott', 'hilton', 'hyatt',
                    'ihg', 'airbnb', 'vrbo', 'booking.com', 'expedia', 'kayak', 'priceline',
                    'hotels.com', 'tripadvisor']
            },
            'Education': {
                color: '#b45309',
                bgColor: '#fef3c7',
                icon: 'book-open',
                keywords: ['school', 'university', 'college', 'tuition', 'course', 'class', 'book',
                    'textbook', 'library', 'education', 'learning', 'training', 'workshop',
                    'seminar', 'tutorial', 'certification', 'lecture'],
                merchants: ['udemy', 'coursera', 'skillshare', 'masterclass', 'linkedin learning',
                    'pluralsight', 'codecademy', 'khan academy', 'chegg', 'amazon kindle',
                    'audible', 'scribd', 'brilliant', 'duolingo']
            },
            'Personal Care': {
                color: '#db2777',
                bgColor: '#fce7f3',
                icon: 'sparkles',
                keywords: ['salon', 'spa', 'barber', 'haircut', 'beauty', 'cosmetic', 'skincare',
                    'makeup', 'nail', 'massage', 'facial', 'waxing', 'grooming', 'dermatology'],
                merchants: ['sephora', 'ulta', 'bath body works', 'lush', 'supercuts',
                    'great clips', 'sport clips', 'glossier', 'the ordinary']
            },
            'Subscriptions': {
                color: '#0891b2',
                bgColor: '#cffafe',
                icon: 'refresh-cw',
                keywords: ['subscription', 'membership', 'monthly', 'annual', 'premium', 'pro plan',
                    'plus', 'cloud storage'],
                merchants: ['amazon prime', 'apple one', 'google one', 'dropbox', 'icloud',
                    'microsoft 365', 'adobe', 'canva', 'notion', 'slack', 'zoom',
                    'github', 'chatgpt']
            },
            'Transfers': {
                color: '#64748b',
                bgColor: '#f1f5f9',
                icon: 'arrow-left-right',
                keywords: ['transfer', 'payment', 'send', 'zelle', 'venmo', 'wire', 'ach'],
                merchants: ['paypal', 'venmo', 'zelle', 'cash app', 'wise', 'western union']
            }
        };

        this.userCorrections = this._loadCorrections();
    }

    categorize(merchantName, amount = 0) {
        const normalized = merchantName.toLowerCase().trim();

        // 1) User-corrected mapping takes priority
        if (this.userCorrections[normalized]) {
            return { category: this.userCorrections[normalized], confidence: 0.99, method: 'learned' };
        }

        // 2) Exact merchant substring match
        for (const [category, data] of Object.entries(this.categories)) {
            for (const merchant of data.merchants) {
                if (normalized.includes(merchant) || merchant.includes(normalized)) {
                    return { category, confidence: 0.95, method: 'merchant-match' };
                }
            }
        }

        // 3) Keyword match with scoring
        let bestMatch = null;
        let bestScore = 0;
        for (const [category, data] of Object.entries(this.categories)) {
            for (const keyword of data.keywords) {
                if (normalized.includes(keyword)) {
                    const score = keyword.length / Math.max(normalized.length, 1);
                    if (score > bestScore) {
                        bestScore = score;
                        bestMatch = category;
                    }
                }
            }
        }
        if (bestMatch && bestScore > 0.08) {
            return { category: bestMatch, confidence: Math.min(0.6 + bestScore * 0.35, 0.92), method: 'keyword-match' };
        }

        // 4) Fuzzy match against merchants
        let fuzzyBest = null;
        let fuzzyScore = 0;
        for (const [category, data] of Object.entries(this.categories)) {
            for (const merchant of data.merchants) {
                const sim = this._similarity(normalized, merchant);
                if (sim > fuzzyScore && sim > 0.55) {
                    fuzzyScore = sim;
                    fuzzyBest = category;
                }
            }
        }
        if (fuzzyBest) {
            return { category: fuzzyBest, confidence: +(fuzzyScore * 0.85).toFixed(2), method: 'fuzzy-match' };
        }

        return { category: 'Other', confidence: 0.3, method: 'default' };
    }

    /** Levenshtein-based string similarity (0-1) */
    _similarity(a, b) {
        const la = a.length, lb = b.length;
        if (la === 0 && lb === 0) return 1;
        const mx = Array.from({ length: la + 1 }, (_, i) => {
            const row = new Array(lb + 1);
            row[0] = i;
            return row;
        });
        for (let j = 0; j <= lb; j++) mx[0][j] = j;
        for (let i = 1; i <= la; i++) {
            for (let j = 1; j <= lb; j++) {
                const cost = a[i - 1] === b[j - 1] ? 0 : 1;
                mx[i][j] = Math.min(mx[i - 1][j] + 1, mx[i][j - 1] + 1, mx[i - 1][j - 1] + cost);
            }
        }
        return 1 - mx[la][lb] / Math.max(la, lb);
    }

    /** Record a user correction so future categorizations use it */
    learn(merchantName, category) {
        this.userCorrections[merchantName.toLowerCase().trim()] = category;
        this._saveCorrections();
    }

    getCategoryInfo(cat) {
        return this.categories[cat] || { color: '#6b7280', bgColor: '#f3f4f6', icon: 'tag' };
    }

    getAllCategories() {
        return [...Object.keys(this.categories), 'Other'];
    }

    getCategoryColor(cat) {
        return (this.categories[cat] || { color: '#6b7280' }).color;
    }

    _loadCorrections() {
        try { return JSON.parse(localStorage.getItem('expense_corrections') || '{}'); }
        catch { return {}; }
    }
    _saveCorrections() {
        localStorage.setItem('expense_corrections', JSON.stringify(this.userCorrections));
    }
}

window.TransactionCategorizer = TransactionCategorizer;
