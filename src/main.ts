import './style.css'
import Chart from 'chart.js/auto';
import type { ChartConfiguration } from 'chart.js';

// --- 型定義 ---
interface ExchangeRate {
    currencyPair: string;
    price: { value: number; currency: string };
    timestamp: string;
}

// --- 定数・状態管理 ---
const API_BASE_URL = 'http://localhost:8080/exchangerates';
const TARGET_PAIRS = ['USDJPY', 'EURJPY'];
const MAX_HISTORY = 20;

const charts: Record<string, Chart> = {};
const priceHistory: Record<string, number[]> = {};
const previousPrices: Record<string, number> = {};

// --- チャートの初期化 ---
function initChart(pair: string) {
    const canvas = document.getElementById(`chart-${pair}`) as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    priceHistory[pair] = [];

    const config: ChartConfiguration = {
        type: 'line',
        data: {
            labels: Array(MAX_HISTORY).fill(''),
            datasets: [{
                data: [],
                borderColor: '#0ecb81',
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.3,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { display: false },
                y: { display: false }
            },
            plugins: { legend: { display: false } }
        }
    };
    charts[pair] = new Chart(ctx, config);
}

// --- 個別のチャート更新ロジック ---
function updateChart(pair: string, newPrice: number) {
    const chart = charts[pair];
    const history = priceHistory[pair];
    if (!chart || !history) return;

    history.push(newPrice);
    if (history.length > MAX_HISTORY) history.shift();

    chart.data.datasets[0].data = history;

    const oldPrice = history[history.length - 2];
    if (oldPrice !== undefined) {
        chart.data.datasets[0].borderColor = newPrice >= oldPrice ? '#0ecb81' : '#f6465d';
    }

    chart.update('none');
}

// --- UI（数字・アニメーション）の更新ロิジック ---
function updateUI(pair: string, data: ExchangeRate) {
    const card = document.getElementById(pair);
    if (!card) return;

    const newPrice = data.price.value;
    const oldPrice = previousPrices[pair];

    // ボタン内の価格表示要素をすべて更新
    const priceElements = card.querySelectorAll('.price-value');
    priceElements.forEach((el) => {
        const element = el as HTMLElement;
        element.textContent = newPrice.toFixed(3);

        // 前回の価格と比較して点滅アニメーションを適用
        if (oldPrice !== undefined && newPrice !== oldPrice) {
            const statusClass = newPrice > oldPrice ? 'up-flash' : 'down-flash';
            element.classList.remove('up-flash', 'down-flash');
            void element.offsetWidth; // 強制リフロー
            element.classList.add(statusClass);
        }
    });

    // チャートの更新
    updateChart(pair, newPrice);

    // タイムスタンプの更新
    const timeElement = card.querySelector('.timestamp') as HTMLElement;
    timeElement.textContent = `Last update: ${new Date(data.timestamp).toLocaleTimeString()}`;

    // 価格を保存
    previousPrices[pair] = newPrice;
}

// --- APIからデータを取得 ---
async function fetchAndUpdatePrice(pair: string) {
    try {
        const response = await fetch(`${API_BASE_URL}/${pair}`);
        if (!response.ok) return;
        const data: ExchangeRate = await response.json();
        updateUI(pair, data);
    } catch (error) {
        console.error(`Error fetching ${pair}:`, error);
    }
}

// --- アプリケーションの起動 ---
document.addEventListener('DOMContentLoaded', () => {
    TARGET_PAIRS.forEach(pair => {
        initChart(pair);
        fetchAndUpdatePrice(pair); // 初回実行
    });

    // 1秒ごとにポーリング
    setInterval(() => {
        TARGET_PAIRS.forEach(fetchAndUpdatePrice);
    }, 1000);

    // ダミーボタンのクリックイベント（おまけ）
    document.querySelectorAll('.trade-button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const pair = (e.currentTarget as HTMLElement).closest('.price-card')?.id;
            const type = (e.currentTarget as HTMLElement).classList.contains('bid') ? 'SELL' : 'BUY';
            console.log(`Order Sent: ${type} ${pair} at ${previousPrices[pair || '']}`);
            alert(`${pair} の ${type} 注文（ダミー）を送信しました`);
        });
    });
});