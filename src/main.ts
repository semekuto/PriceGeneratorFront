import './style.css'

// APIの型定義
interface ExchangeRate {
    currencyPair: string;
    price: { value: number; currency: string };
    timestamp: string;
}

const API_BASE_URL = 'http://localhost:8080/exchangerates';
const TARGET_PAIRS = ['USDJPY', 'EURJPY']; // 監視対象

// 前回の値を保持する用
const previousPrices: Record<string, number> = {};

async function fetchAndUpdatePrice(pair: string) {
    try {
        const response = await fetch(`${API_BASE_URL}/${pair}`);
        if (!response.ok) throw new Error('Network response was not ok');

        const data: ExchangeRate = await response.ok ? await response.json() : null;
        if (!data) return;

        updateUI(pair, data);
    } catch (error) {
        console.error(`Failed to fetch ${pair}:`, error);
    }
}

function updateUI(pair: string, data: ExchangeRate) {
    const card = document.getElementById(pair);
    if (!card) return;

    const valueElement = card.querySelector('.price-value') as HTMLElement;
    const timeElement = card.querySelector('.timestamp') as HTMLElement;

    const newPrice = data.price.value;
    const oldPrice = previousPrices[pair];

    // 価格の表示更新
    valueElement.textContent = newPrice.toFixed(3);
    timeElement.textContent = new Date(data.timestamp).toLocaleTimeString();

    // 変化に応じて色を変える
    card.classList.remove('up', 'down');
    if (oldPrice !== undefined) {
        if (newPrice > oldPrice) card.classList.add('up');
        else if (newPrice < oldPrice) card.classList.add('down');
    }

    previousPrices[pair] = newPrice;
}

// 1秒ごとに実行
setInterval(() => {
    TARGET_PAIRS.forEach(fetchAndUpdatePrice);
}, 1000);