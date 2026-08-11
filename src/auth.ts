/**
 * 固定のユーザー名・パスワードによる簡易ログイン。
 * データベースや外部認証サービスは使用せず、ログイン状態はブラウザのlocalStorageだけで保持する。
 * 認証情報はビルド後のJavaScriptに含まれるため、社内向けの画面制限であり、機密情報の保護には使用しない。
 */

/** ログイン状態を保存するlocalStorageのキー。 */
export const AUTH_STORAGE_KEY = 'lift-stroke-auth'

/** ログイン済みを表す保存値。形式が変わった場合は再ログインさせる。 */
const AUTH_STORAGE_VALUE = 'logged-in'

const FIXED_USERNAME = 'muratec'
const FIXED_PASSWORD = 'muratec'

/**
 * localStorageを取得する。
 * シークレットモードやストレージ無効設定では参照時に例外が発生するため、その場合はnullを返す。
 */
function getStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

/** 固定値と一致するかどうかを判定する。前後の空白は無視し、大文字小文字は区別する。 */
export function verifyCredentials(username: string, password: string): boolean {
  return username.trim() === FIXED_USERNAME && password.trim() === FIXED_PASSWORD
}

/** 同じPC・同じブラウザでログイン済みかどうかを判定する。 */
export function isLoggedIn(): boolean {
  try {
    return getStorage()?.getItem(AUTH_STORAGE_KEY) === AUTH_STORAGE_VALUE
  } catch {
    return false
  }
}

/** ログイン状態をlocalStorageへ保存する。保存できない環境では毎回ログインが必要になる。 */
export function saveLogin(): void {
  try {
    getStorage()?.setItem(AUTH_STORAGE_KEY, AUTH_STORAGE_VALUE)
  } catch {
    // 保存できない場合もアプリの利用は継続できるため、エラーは無視する。
  }
}

/** ログアウト時にlocalStorageのログイン情報を削除する。 */
export function clearLogin(): void {
  try {
    getStorage()?.removeItem(AUTH_STORAGE_KEY)
  } catch {
    // 削除できない場合もログアウト自体は継続する。
  }
}
