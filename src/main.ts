import './style.css'
import Chart from 'chart.js/auto';
import type { ChartConfiguration } from 'chart.js';

// --- 型定義 ---
interface PriceDetail {
    price: { value: number; currency: string; }
}

interface ExchangeRate {
    bidPrice: PriceDetail;
    offerPrice: PriceDetail;
    currencyPair: string;
    timeStamp: string; // バックエンドのフィールド名に合わせる
}

const API_BASE_URL = 'http://localhost:8080/exchangerates';
const TARGET_PAIRS = ['USDJPY', 'EURJPY'];
const MAX_HISTORY = 20;

const charts: Record<string, Chart> = {};
const bidHistory: Record<string, number[]> = {};
const offerHistory: Record<string, number[]> = {};

function initChart(pair: string) {
    const canvas = document.getElementById(`chart-${pair}`) as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    bidHistory[pair] = [];
    offerHistory[pair] = [];

    const config: ChartConfiguration = {
        type: 'line',
        data: {
            labels: Array(MAX_HISTORY).fill(''),
            datasets: [
                {
                    label: 'Bid',
                    data: [],
                    borderColor: '#f6465d',
                    borderWidth: 1.5,
                    pointRadius: 0,
                    tension: 0.3,
                },
                {
                    label: 'Offer',
                    data: [],
                    borderColor: '#0ecb81',
                    borderWidth: 1.5,
                    pointRadius: 0,
                    tension: 0.3,
                }
            ]
        },
// --- initChart 関数内の scales 部分を修正 ---
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { display: false },
                y: {
                    display: false,
                    grace: '5%',
                    beginAtZero: false // 0を基準にしない（これ重要！）
                }
            },
            plugins: { legend: { display: false } }
        }
    };
    charts[pair] = new Chart(ctx, config);
}

function updateUI(pair: string, data: ExchangeRate) {
    const card = document.getElementById(pair);
    if (!card || !charts[pair]) return;

    const bid = data.bidPrice.price.value;
    const offer = data.offerPrice.price.value;

    const bidValueEl = card.querySelector('.trade-button.bid .price-value') as HTMLElement;
    const askValueEl = card.querySelector('.trade-button.ask .price-value') as HTMLElement;

    const oldBid = bidHistory[pair][bidHistory[pair].length - 1];

    bidValueEl.textContent = bid.toFixed(3);
    askValueEl.textContent = offer.toFixed(3);

    if (oldBid !== undefined && bid !== oldBid) {
        const statusClass = bid > oldBid ? 'up-flash' : 'down-flash';
        [bidValueEl, askValueEl].forEach(el => {
            el.classList.remove('up-flash', 'down-flash');
            void el.offsetWidth;
            el.classList.add(statusClass);
        });
    }

    bidHistory[pair].push(bid);
    offerHistory[pair].push(offer);
    if (bidHistory[pair].length > MAX_HISTORY) {
        bidHistory[pair].shift();
        offerHistory[pair].shift();
    }

    const chart = charts[pair];
    chart.data.datasets[0].data = bidHistory[pair];
    chart.data.datasets[1].data = offerHistory[pair];
    chart.update('none');

    const timeElement = card.querySelector('.timestamp') as HTMLElement;
    timeElement.textContent = `Last update: ${new Date(data.timeStamp).toLocaleTimeString()}`;
}

async function fetchAndUpdatePrice(pair: string) {
    try {
        const response = await fetch(`${API_BASE_URL}/${pair}`);
        if (!response.ok) return;
        const data: ExchangeRate = await response.json();
        updateUI(pair, data);
    } catch (error) {
        console.error(`Error:`, error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    TARGET_PAIRS.forEach(pair => {
        initChart(pair);
        fetchAndUpdatePrice(pair);
    });

    setInterval(() => TARGET_PAIRS.forEach(fetchAndUpdatePrice), 1000);

    // --- クリックイベントの復活と改良 ---
    document.querySelectorAll('.trade-button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const card = (e.currentTarget as HTMLElement).closest('.price-card');
            const pair = card?.id || 'Unknown';
            const isBid = (e.currentTarget as HTMLElement).classList.contains('bid');

            // 最新のBidまたはOfferの価格を取得
            const currentBid = bidHistory[pair][bidHistory[pair].length - 1];
            const currentOffer = offerHistory[pair][offerHistory[pair].length - 1];
            const price = isBid ? currentBid : currentOffer;
            const type = isBid ? 'SELL' : 'BUY';

            console.log(`[Order] ${type} ${pair} @ ${price.toFixed(3)}`);
            alert(`${pair} を ${price.toFixed(3)} で ${type} しました（ダミー注文）`);
        });
    });
});