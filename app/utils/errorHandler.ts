/**
 * エラーハンドリング: 分類とユーザー向けメッセージ
 */

export type ErrorKind = "network" | "api" | "data" | "unknown";

export type ParsedError = {
  kind: ErrorKind;
  message: string;
  userMessage: string;
};

/**
 * エラーを分類し、ユーザー向けメッセージを返す
 */
export function parseError(err: unknown): ParsedError {
  if (err instanceof TypeError && err.message.includes("fetch")) {
    return {
      kind: "network",
      message: err.message,
      userMessage: "ネットワークに接続できません。通信環境を確認して再度お試しください。",
    };
  }

  if (err instanceof Error) {
    const msg = err.message.toLowerCase();

    if (msg.includes("network") || msg.includes("failed to fetch") || msg.includes("load failed")) {
      return {
        kind: "network",
        message: err.message,
        userMessage: "ネットワークに接続できません。通信環境を確認して再度お試しください。",
      };
    }

    if (msg.includes("429") || msg.includes("rate limit")) {
      return {
        kind: "api",
        message: err.message,
        userMessage: "リクエストが多すぎます。しばらく待ってから再度お試しください。",
      };
    }

    if (msg.includes("404") || msg.includes("not found") || msg.includes("no movies")) {
      return {
        kind: "data",
        message: err.message,
        userMessage: "条件に合う映画が見つかりませんでした。フィルターを変えてお試しください。",
      };
    }

    if (msg.includes("500") || msg.includes("server")) {
      return {
        kind: "api",
        message: err.message,
        userMessage: "サーバーで問題が発生しました。しばらくしてから再度お試しください。",
      };
    }

    return {
      kind: "unknown",
      message: err.message,
      userMessage: err.message || "予期しないエラーが発生しました。もう一度お試しください。",
    };
  }

  return {
    kind: "unknown",
    message: String(err),
    userMessage: "予期しないエラーが発生しました。もう一度お試しください。",
  };
}

/**
 * APIレスポンスの status からユーザー向けメッセージを返す
 */
export function getMessageFromStatus(status: number): string {
  switch (status) {
    case 400:
      return "リクエストが正しくありません。";
    case 404:
      return "条件に合う映画が見つかりませんでした。";
    case 429:
      return "リクエストが多すぎます。しばらく待ってから再度お試しください。";
    case 500:
    case 502:
    case 503:
      return "サーバーで問題が発生しました。しばらくしてから再度お試しください。";
    default:
      return "映画の取得に失敗しました。もう一度お試しください。";
  }
}
