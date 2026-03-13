/**
 * TMDb API レート制限管理ユーティリティ
 * 
 * 【将来の拡張用】現在は使用していません
 * 
 * TMDb APIのレート制限（40リクエスト/10秒）に対応するため、
 * リクエストキューイングと指数バックオフリトライを実装
 * 
 * 使用する場合:
 * - ユーザー数が100人以上になった場合
 * - 同時アクセスが10人以上になることが多い場合
 * - 429エラーが頻繁に発生する場合
 * 
 * 使用方法:
 * app/api/movies/route.ts で fetch を rateLimitedFetch に置き換える
 */

// リクエストキューアイテムの型
type QueuedRequest<T> = {
  url: string;
  options: RequestInit;
  resolve: (value: Response) => void;
  reject: (error: Error) => void;
  retryCount: number;
  timestamp: number;
};

// レート制限設定
const RATE_LIMIT = {
  MAX_REQUESTS: 40, // 10秒間に最大40リクエスト
  WINDOW_MS: 10000, // 10秒
  MIN_INTERVAL_MS: 50, // 最小リクエスト間隔（50ms）- 並列処理を許可
  MAX_RETRIES: 3, // 最大リトライ回数
  INITIAL_BACKOFF_MS: 1000, // 初期バックオフ時間（1秒）
  MAX_CONCURRENT: 10, // 最大同時リクエスト数
};

// リクエスト履歴（タイムスタンプの配列）
let requestHistory: number[] = [];

// リクエストキュー
let requestQueue: QueuedRequest<any>[] = [];

// 最後のリクエスト時刻
let lastRequestTime = 0;

// 現在実行中のリクエスト数
let activeRequests = 0;

/**
 * リクエスト履歴をクリーンアップ（10秒以上前の記録を削除）
 */
function cleanupRequestHistory() {
  const now = Date.now();
  requestHistory = requestHistory.filter(
    (timestamp) => now - timestamp < RATE_LIMIT.WINDOW_MS,
  );
}

/**
 * 次のリクエストまで待機する時間を計算
 */
function calculateWaitTime(): number {
  cleanupRequestHistory();
  
  const now = Date.now();
  
  // 最小間隔チェック
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < RATE_LIMIT.MIN_INTERVAL_MS) {
    return RATE_LIMIT.MIN_INTERVAL_MS - timeSinceLastRequest;
  }
  
  // レート制限チェック（10秒間に40リクエスト）
  if (requestHistory.length >= RATE_LIMIT.MAX_REQUESTS) {
    const oldestRequest = requestHistory[0];
    const waitTime = RATE_LIMIT.WINDOW_MS - (now - oldestRequest);
    return Math.max(waitTime, RATE_LIMIT.MIN_INTERVAL_MS);
  }
  
  return 0;
}

/**
 * 指数バックオフで待機時間を計算
 */
function calculateBackoffDelay(retryCount: number): number {
  return RATE_LIMIT.INITIAL_BACKOFF_MS * Math.pow(2, retryCount);
}

/**
 * リクエストを実行
 */
async function executeRequest<T>(
  url: string,
  options: RequestInit,
): Promise<Response> {
  // 最小間隔のみチェック（サーバーレス関数ではグローバル変数が共有されないため簡略化）
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < RATE_LIMIT.MIN_INTERVAL_MS) {
    const waitTime = RATE_LIMIT.MIN_INTERVAL_MS - timeSinceLastRequest;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }
  
  lastRequestTime = Date.now();
  
  // リクエスト実行
  const response = await fetch(url, options);
  
  return response;
}

/**
 * 単一リクエストを処理
 */
async function processRequest(request: QueuedRequest<any>) {
  activeRequests++;
  
  try {
    const response = await executeRequest(request.url, request.options);
    
    // 429エラー（Too Many Requests）の場合、リトライ
    if (response.status === 429) {
      if (request.retryCount < RATE_LIMIT.MAX_RETRIES) {
        const backoffDelay = calculateBackoffDelay(request.retryCount);
        
        // キューに再追加（先頭に挿入）
        requestQueue.unshift({
          ...request,
          retryCount: request.retryCount + 1,
          timestamp: Date.now(),
        });
        
        // バックオフ待機
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      } else {
        // 最大リトライ回数に達した場合
        request.reject(
          new Error(
            `Rate limit exceeded. Please try again later. (Status: ${response.status})`,
          ),
        );
      }
    } else if (!response.ok) {
      // その他のエラー
      request.reject(
        new Error(
          `Request failed with status ${response.status}: ${response.statusText}`,
        ),
      );
    } else {
      // 成功
      request.resolve(response);
    }
  } catch (error) {
    // ネットワークエラーなどの場合
    if (request.retryCount < RATE_LIMIT.MAX_RETRIES) {
      const backoffDelay = calculateBackoffDelay(request.retryCount);
      
      // キューに再追加
      requestQueue.unshift({
        ...request,
        retryCount: request.retryCount + 1,
        timestamp: Date.now(),
      });
      
      // バックオフ待機
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    } else {
      request.reject(
        error instanceof Error
          ? error
          : new Error("Request failed after multiple retries"),
      );
    }
  } finally {
    activeRequests--;
    // キューに残りのリクエストがあれば処理を続ける
    processQueue();
  }
}

/**
 * キューからリクエストを処理（並列処理対応）
 */
async function processQueue() {
  // 既に最大同時リクエスト数に達している場合は待機
  if (activeRequests >= RATE_LIMIT.MAX_CONCURRENT) {
    return;
  }
  
  // 処理できるリクエスト数を計算
  const availableSlots = RATE_LIMIT.MAX_CONCURRENT - activeRequests;
  const requestsToProcess = Math.min(availableSlots, requestQueue.length);
  
  if (requestsToProcess === 0) {
    return;
  }
  
  // 複数のリクエストを並列で処理
  const requests: QueuedRequest<any>[] = [];
  for (let i = 0; i < requestsToProcess; i++) {
    const request = requestQueue.shift();
    if (request) {
      requests.push(request);
    }
  }
  
  // 並列で処理開始（awaitしない）
  requests.forEach((request) => {
    processRequest(request).catch((error) => {
      console.error("[RateLimiter] Request processing error:", error);
    });
  });
}

/**
 * レート制限を考慮したfetch関数
 * 
 * @param url リクエストURL
 * @param options fetchオプション
 * @returns Promise<Response>
 */
export async function rateLimitedFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  return new Promise((resolve, reject) => {
    // キューに追加
    requestQueue.push({
      url,
      options,
      resolve,
      reject,
      retryCount: 0,
      timestamp: Date.now(),
    });
    
    // キュー処理を開始（非同期）
    processQueue().catch((error) => {
      // キュー処理中のエラーは無視（個別のリクエストで処理される）
      console.error("[RateLimiter] Queue processing error:", error);
    });
  });
}

/**
 * リクエストキューをクリア（テスト用）
 */
export function clearQueue() {
  requestQueue = [];
  requestHistory = [];
  lastRequestTime = 0;
  activeRequests = 0;
}

/**
 * 現在のキュー状態を取得（デバッグ用）
 */
export function getQueueStatus() {
  return {
    queueLength: requestQueue.length,
    requestHistoryLength: requestHistory.length,
    activeRequests,
    lastRequestTime,
  };
}
